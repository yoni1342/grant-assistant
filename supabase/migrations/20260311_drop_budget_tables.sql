-- Drop budget tables and enum (budget is now a generated section of proposals, not a separate entity)
DROP TABLE IF EXISTS budget_line_items CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TYPE IF EXISTS budget_category CASCADE;
