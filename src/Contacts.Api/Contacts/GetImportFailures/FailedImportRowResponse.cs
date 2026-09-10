namespace Contacts.Api.Contacts.GetImportFailures;

public sealed record FailedImportRowResponse(
    string RowHash,
    int RowNumber,
    string RawRow,
    string ErrorMessage,
    DateTime FirstSeenAtUtc,
    DateTime LastSeenAtUtc,
    int Attempts);

public sealed record FailedImportRowsResponse(IReadOnlyList<FailedImportRowResponse> Items, int TotalCount);
