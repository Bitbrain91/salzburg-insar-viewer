UPDATE insar_points
SET look_angle = 280.2
WHERE area_id = 'bad_gastein'
  AND dataset_id = 'bad_gastein_snt'
  AND track = 22;

UPDATE insar_points
SET incidence_angle = 45.66
WHERE area_id = 'bad_gastein'
  AND dataset_id = 'bad_gastein_snt'
  AND track = 22
  AND incidence_angle IS NULL;
