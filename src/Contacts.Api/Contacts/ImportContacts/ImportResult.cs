namespace Contacts.Api.Contacts.ImportContacts;

public sealed record ImportResult(int ImportedCount, IReadOnlyList<ImportRowError> Errors, int TotalErrorCount);

public sealed record ImportRowError(int Row, string Message, string RowHash);
