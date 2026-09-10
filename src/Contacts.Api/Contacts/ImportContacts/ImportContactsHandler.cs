using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Contacts.Api.Contacts;
using Contacts.Api.Data;
using Contacts.Domain;
using CsvHelper;
using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Contacts.ImportContacts;

public sealed class ImportContactsHandler(ContactsDbContext dbContext)
{
    private const int MaxFileBytes = 200 * 1024 * 1024;
    private const int MaxDataRows = 2_000_000;
    private const int BatchSize = 5_000;
    private const int MaxErrorSample = 100;

    private static readonly string[] RequiredColumns =
        ["FirstName", "Surname", "DateOfBirth", "Street", "City", "PostalCode", "Country", "Phone", "Iban"];

    public async Task<IResult> HandleAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length == 0)
        {
            return Results.BadRequest(new { error = "The uploaded file is empty." });
        }

        if (file.Length > MaxFileBytes)
        {
            return Results.BadRequest(new { error = $"The file exceeds the {MaxFileBytes / 1024 / 1024} MB import limit." });
        }

        // A full pass over the file before any writes: checks the header, the row count limit,
        // and that every row can actually be read. A file that fails here is rejected with no
        // batch ever committed -- previously a row-count or CSV-syntax problem discovered deep
        // into the file could be reported as a 400 after earlier batches had already saved.
        var structureError = ValidateStructure(file);
        if (structureError is not null)
        {
            return Results.BadRequest(new { error = structureError });
        }

        using var reader = new StreamReader(file.OpenReadStream());
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
        csv.Read();
        csv.ReadHeader();

        // Good rows are saved even when other rows in the same file fail; failing rows are
        // recorded in FailedImportRows instead of being dropped, so they can be reviewed later.
        var existingIbans = (await dbContext.Contacts.AsNoTracking().Select(contact => contact.Iban).ToListAsync(cancellationToken))
            .Select(iban => iban.Value)
            .ToHashSet();

        var contactsToSave = new List<Contact>(BatchSize);
        var failedRowsToSave = new List<(string Hash, int Row, string Raw, string Message)>(BatchSize);
        var errorSample = new List<ImportRowError>();
        var importedCount = 0;
        var totalErrorCount = 0;
        var row = 1;

        while (csv.Read())
        {
            row++;

            var rawRow = string.Join("|", RequiredColumns.Select(column => csv.GetField(column) ?? ""));

            Contact? contact = null;
            string? errorMessage = null;

            try
            {
                contact = ContactCsvRow.Parse(name => csv.GetField(name));
            }
            catch (Exception ex) when (ex is ArgumentException or FormatException)
            {
                errorMessage = ex.Message;
            }

            // Catches an IBAN already used by a saved contact as well as two rows in this
            // same file sharing an IBAN, since accepted rows are added to existingIbans below.
            if (contact is not null && !existingIbans.Add(contact.Iban.Value))
            {
                errorMessage = $"A contact with IBAN {contact.Iban.Value} already exists.";
                contact = null;
            }

            if (contact is not null)
            {
                contactsToSave.Add(contact);

                if (contactsToSave.Count >= BatchSize)
                {
                    await SaveContactBatchAsync(contactsToSave, cancellationToken);
                    importedCount += contactsToSave.Count;
                    contactsToSave.Clear();
                }
            }
            else
            {
                totalErrorCount++;
                var rowHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawRow)));
                if (errorSample.Count < MaxErrorSample)
                {
                    errorSample.Add(new ImportRowError(row, errorMessage!, rowHash));
                }

                failedRowsToSave.Add((rowHash, row, rawRow, errorMessage!));

                // Flushed in bounded batches too, same as contacts, so a file with a huge
                // number of bad rows does not hold every failure in memory at once.
                if (failedRowsToSave.Count >= BatchSize)
                {
                    await RecordFailuresAsync(failedRowsToSave, cancellationToken);
                    failedRowsToSave.Clear();
                }
            }
        }

        if (contactsToSave.Count > 0)
        {
            await SaveContactBatchAsync(contactsToSave, cancellationToken);
            importedCount += contactsToSave.Count;
        }

        if (failedRowsToSave.Count > 0)
        {
            await RecordFailuresAsync(failedRowsToSave, cancellationToken);
        }

        return Results.Ok(new ImportResult(importedCount, errorSample, totalErrorCount));
    }

    private static string? ValidateStructure(IFormFile file)
    {
        using var reader = new StreamReader(file.OpenReadStream());
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        if (!csv.Read() || !csv.ReadHeader())
        {
            return "The file has no header row.";
        }

        var missingColumns = RequiredColumns.Where(column => !csv.HeaderRecord!.Contains(column)).ToList();
        if (missingColumns.Count > 0)
        {
            return $"The file is missing required columns: {string.Join(", ", missingColumns)}.";
        }

        var row = 1;
        try
        {
            while (csv.Read())
            {
                row++;

                if (row - 1 > MaxDataRows)
                {
                    return $"The file exceeds the {MaxDataRows}-row import limit.";
                }

                // Touch every required field so a structurally broken row (wrong column count,
                // bad quoting) is caught here, before any batch has been written, rather than
                // surfacing as an unhandled error mid-import.
                foreach (var column in RequiredColumns)
                {
                    _ = csv.GetField(column);
                }
            }
        }
        catch (CsvHelperException ex)
        {
            return $"The file is malformed at row {row}: {ex.Message}";
        }

        return null;
    }

    private async Task SaveContactBatchAsync(List<Contact> contacts, CancellationToken cancellationToken)
    {
        dbContext.Contacts.AddRange(contacts);
        await dbContext.SaveChangesAsync(cancellationToken);
        dbContext.ChangeTracker.Clear();
    }

    private async Task RecordFailuresAsync(
        List<(string Hash, int Row, string Raw, string Message)> failedRows,
        CancellationToken cancellationToken)
    {
        // Grouped by content hash so importing the same bad row (e.g. the same file) many
        // times updates one record instead of creating a new one each time.
        var hashes = failedRows.Select(failedRow => failedRow.Hash).Distinct().ToList();
        var existingFailedRows = await dbContext.FailedImportRows
            .Where(failedRow => hashes.Contains(failedRow.RowHash))
            .ToDictionaryAsync(failedRow => failedRow.RowHash, cancellationToken);

        foreach (var group in failedRows.GroupBy(failedRow => failedRow.Hash))
        {
            var latest = group.OrderBy(failedRow => failedRow.Row).Last();
            if (existingFailedRows.TryGetValue(group.Key, out var existingFailedRow))
            {
                existingFailedRow.RecordOccurrence(latest.Row, latest.Message, group.Count());
            }
            else
            {
                dbContext.FailedImportRows.Add(
                    FailedImportRow.Create(group.Key, latest.Row, latest.Raw, latest.Message, group.Count()));
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        dbContext.ChangeTracker.Clear();
    }
}
