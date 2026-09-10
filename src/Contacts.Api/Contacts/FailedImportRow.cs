namespace Contacts.Api.Contacts;

public sealed class FailedImportRow
{
    public Guid Id { get; private set; }
    public string RowHash { get; private set; } = "";
    public int LatestRowNumber { get; private set; }
    public string RawRow { get; private set; } = "";
    public string ErrorMessage { get; private set; } = "";
    public DateTime FirstSeenAtUtc { get; private set; }
    public DateTime LastSeenAtUtc { get; private set; }
    public int Attempts { get; private set; }

    private FailedImportRow()
    {
    }

    public static FailedImportRow Create(string rowHash, int rowNumber, string rawRow, string errorMessage, int occurrences)
    {
        var now = DateTime.UtcNow;
        return new FailedImportRow
        {
            Id = Guid.NewGuid(),
            RowHash = rowHash,
            LatestRowNumber = rowNumber,
            RawRow = rawRow,
            ErrorMessage = errorMessage,
            FirstSeenAtUtc = now,
            LastSeenAtUtc = now,
            Attempts = occurrences,
        };
    }

    public void RecordOccurrence(int rowNumber, string errorMessage, int occurrences)
    {
        LatestRowNumber = rowNumber;
        ErrorMessage = errorMessage;
        LastSeenAtUtc = DateTime.UtcNow;
        Attempts += occurrences;
    }
}
