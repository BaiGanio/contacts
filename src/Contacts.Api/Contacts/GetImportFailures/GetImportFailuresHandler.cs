using Contacts.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Contacts.GetImportFailures;

public sealed class GetImportFailuresHandler(ContactsDbContext dbContext)
{
    private const int MaxLimit = 500;

    public async Task<FailedImportRowsResponse> HandleAsync(
        int limit, IReadOnlyCollection<string>? rowHashes, CancellationToken cancellationToken)
    {
        var totalCount = await dbContext.FailedImportRows.CountAsync(cancellationToken);

        var query = dbContext.FailedImportRows.AsNoTracking();
        // A specific import run's own failures are looked up by their exact row hashes
        // instead of the most-recently-seen page, since "most recent" and "this run's
        // error sample" are different slices once a file has more failures than one page.
        query = rowHashes is { Count: > 0 }
            ? query.Where(failedRow => rowHashes.Contains(failedRow.RowHash))
            : query.OrderByDescending(failedRow => failedRow.LastSeenAtUtc).Take(Math.Clamp(limit, 1, MaxLimit));

        var failures = await query
            .Select(failedRow => new FailedImportRowResponse(
                failedRow.RowHash,
                failedRow.LatestRowNumber,
                failedRow.RawRow,
                failedRow.ErrorMessage,
                failedRow.FirstSeenAtUtc,
                failedRow.LastSeenAtUtc,
                failedRow.Attempts))
            .ToListAsync(cancellationToken);

        return new FailedImportRowsResponse(failures, totalCount);
    }
}
