-- Ensure every grant has a non-empty title
ALTER TABLE grants
  ADD CONSTRAINT grants_title_not_empty
  CHECK (trim(title) <> '');
