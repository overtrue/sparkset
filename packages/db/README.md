# @sparkset/db

Prisma-based data layer for Sparkset.

## Setup

1. Set `DATABASE_URL` (MySQL/PostgreSQL). Example:
   - `mysql://user:pass@localhost:3306/sparkset`
2. Generate client: `pnpm --filter @sparkset/db prisma generate --schema prisma/schema.prisma`
3. Apply schema: `pnpm --filter @sparkset/db prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script | mysql ...` or run SQL in `prisma/migrations/0001_init.sql`.

## Notes

- Schema matches core models: datasources, table_schemas, column_definitions, actions, conversations, conversation_messages.
- Repositories: PrismaDatasourceRepository, PrismaActionRepository, PrismaConversationRepository.
