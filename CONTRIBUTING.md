# Contributing Guide

## Development Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` and configure
4. Generate Prisma client: `pnpm run db:generate`
5. Run migrations: `pnpm run db:migrate`
6. Seed database: `pnpm run db:seed`
7. Start dev server: `pnpm run dev`

## Code Style

- Use ES6+ features
- Follow existing code patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

## Commit Messages

- Use conventional commit format
- Prefix with: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`
- Be descriptive but concise

## Pull Request Process

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Update documentation if needed
5. Submit PR with clear description

## Project Structure

```
src/
├── application/    # Business logic (Use Cases)
├── domain/         # Domain entities and interfaces
├── infrastructure/ # External integrations (DB, Services)
├── interfaces/     # Controllers, Routes, Middlewares
└── utils/          # Utility functions
```

