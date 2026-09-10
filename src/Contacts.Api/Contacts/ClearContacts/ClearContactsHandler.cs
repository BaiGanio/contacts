using Contacts.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Contacts.ClearContacts;

public sealed class ClearContactsHandler(ContactsDbContext dbContext)
{
    public async Task HandleAsync(CancellationToken cancellationToken)
    {
        // TRUNCATE, not DELETE FROM, so clearing a multi-million-row test import stays
        // instant instead of scanning and logging every row.
        await dbContext.Database.ExecuteSqlRawAsync(
            """TRUNCATE TABLE "Contacts", "FailedImportRows" RESTART IDENTITY""", cancellationToken);
    }
}
