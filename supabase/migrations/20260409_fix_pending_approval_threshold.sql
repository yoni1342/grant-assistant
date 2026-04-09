-- Move grants with screening_score < 85 back to screening stage
-- Previously the threshold was ~70, now it's 85
UPDATE grants
SET stage = 'screening',
    updated_at = now()
WHERE stage = 'pending_approval'
  AND (screening_score < 85 OR screening_score IS NULL);
