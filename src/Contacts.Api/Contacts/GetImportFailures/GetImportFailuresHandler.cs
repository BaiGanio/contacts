using Contacts.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Contacts.GetImportFailures;

public sealed class GetImportFailuresHandler(ContactsDbContext dbContext)
{
    private const int MaxLimit = 500;

    public async Task<FailedImportRowsResponse> HandleAsync(int limit, CancellationToken cancellationToken)
    {
        var boundedLimit = Math.Clamp(limit, 1, MaxLimit);

        var totalCount = await dbContext.FailedImportRows.CountAsync(cancellationToken);
        var failures = await dbContext.FailedImportRows
            .AsNoTracking()
            .OrderByDescending(failedRow => failedRow.LastSeenAtUtc)
            .Take(boundedLimit)
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
