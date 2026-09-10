namespace Contacts.Api.Contacts.ImportContacts;

public sealed record ImportResult(int ImportedCount, IReadOnlyList<ImportRowError> Errors);

public sealed record ImportRowError(int Row, string Message);
