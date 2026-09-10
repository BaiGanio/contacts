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

        using var reader = new StreamReader(file.OpenReadStream());
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        if (!csv.Read() || !csv.ReadHeader())
        {
            return Results.BadRequest(new { error = "The file has no header row." });
        }

        var missingColumns = RequiredColumns.Where(column => !csv.HeaderRecord!.Contains(column)).ToList();
        if (missingColumns.Count > 0)
        {
            return Results.BadRequest(new { error = $"The file is missing required columns: {string.Join(", ", missingColumns)}." });
        }

        // Good rows are saved even when other rows in the same file fail; failing rows are
        // recorded in FailedImportRows instead of being dropped, so they can be reviewed later.
        var existingIbans = (await dbContext.Contacts.AsNoTracking().Select(contact => contact.Iban).ToListAsync(cancellationToken))
            .Select(iban => iban.Value)
            .ToHashSet();

        var contactsToSave = new List<Contact>(BatchSize);
        var errors = new List<ImportRowError>();
        var failedRows = new List<(string Hash, int Row, string Raw, string Message)>();
        var importedCount = 0;
        var row = 1;

        while (csv.Read())
        {
            row++;

            if (row - 1 > MaxDataRows)
            {
                return Results.BadRequest(new { error = $"The file exceeds the {MaxDataRows}-row import limit." });
            }

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

                // Saved in bounded batches, not all at once, so a multi-million-row file
                // does not hold every tracked entity in memory for one giant transaction.
                if (contactsToSave.Count >= BatchSize)
                {
                    dbContext.Contacts.AddRange(contactsToSave);
                    await dbContext.SaveChangesAsync(cancellationToken);
                    dbContext.ChangeTracker.Clear();
                    importedCount += contactsToSave.Count;
                    contactsToSave.Clear();
                }
            }
            else
            {
                errors.Add(new ImportRowError(row, errorMessage!));
                var rowHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawRow)));
                failedRows.Add((rowHash, row, rawRow, errorMessage!));
            }
        }

        if (failedRows.Count > 0)
        {
            var hashes = failedRows.Select(failedRow => failedRow.Hash).Distinct().ToList();
            var existingFailedRows = await dbContext.FailedImportRows
                .Where(failedRow => hashes.Contains(failedRow.RowHash))
                .ToDictionaryAsync(failedRow => failedRow.RowHash, cancellationToken);

            // Grouped by content hash so importing the same bad row (e.g. the same file)
            // many times updates one record instead of creating a new one each time.
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
        }

        if (contactsToSave.Count > 0)
        {
            dbContext.Contacts.AddRange(contactsToSave);
            importedCount += contactsToSave.Count;
        }

        // Always save, even when every row in this batch failed (e.g. a full re-import of
        // duplicate IBANs): the FailedImportRows tracked above still need to be persisted.
        await dbContext.SaveChangesAsync(cancellationToken);

        return Results.Ok(new ImportResult(importedCount, errors));
    }
}
