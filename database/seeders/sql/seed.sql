-- Idempotent seed data for roles, departments, users, cycles, objectives, key_results
-- Assumes MySQL 8+

-- ROLES
INSERT INTO roles (role_name, description, level, allowed_levels, created_at, updated_at)
SELECT 'admin', 'Quản trị viên hệ thống', 'company', JSON_ARRAY('company','unit','team','person'), NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role_name='admin' AND level='company'
);

INSERT INTO roles (role_name, description, level, allowed_levels, created_at, updated_at)
SELECT 'manager', 'Quản lý cấp đơn vị', 'unit', JSON_ARRAY('unit','team','person'), NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role_name='manager' AND level='unit'
);

INSERT INTO roles (role_name, description, level, allowed_levels, created_at, updated_at)
SELECT 'manager', 'Quản lý cấp đội nhóm', 'team', JSON_ARRAY('team','person'), NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role_name='manager' AND level='team'
);

INSERT INTO roles (role_name, description, level, allowed_levels, created_at, updated_at)
SELECT 'member', 'Thành viên cấp đơn vị', 'unit', JSON_ARRAY('person'), NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role_name='member' AND level='unit'
);

INSERT INTO roles (role_name, description, level, allowed_levels, created_at, updated_at)
SELECT 'member', 'Thành viên cấp nhóm', 'team', JSON_ARRAY('person'), NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role_name='member' AND level='team'
);

-- DEPARTMENTS
INSERT INTO departments (d_name, d_description, created_at, updated_at)
SELECT 'Sales', 'Phòng Kinh doanh', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE d_name='Sales');

INSERT INTO departments (d_name, d_description, created_at, updated_at)
SELECT 'Engineering', 'Phòng Kỹ thuật', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE d_name='Engineering');

INSERT INTO departments (d_name, d_description, created_at, updated_at)
SELECT 'HR', 'Phòng Nhân sự', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE d_name='HR');

-- USERS
-- Admin
INSERT INTO users (sub, email, full_name, role_id, department_id, created_at, updated_at)
SELECT 'admin-static-sub', 'okr.admin@company.com', 'System Administrator',
       (SELECT role_id FROM roles WHERE role_name='admin' AND level='company' LIMIT 1),
       NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='okr.admin@company.com');

-- Manager (Engineering)
INSERT INTO users (sub, email, full_name, role_id, department_id, created_at, updated_at)
SELECT 'mgr-eng-static-sub', 'manager.eng@company.com', 'Manager Engineering',
       (SELECT role_id FROM roles WHERE role_name='manager' AND level='unit' LIMIT 1),
       (SELECT department_id FROM departments WHERE d_name='Engineering' LIMIT 1), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='manager.eng@company.com');

-- Member (Engineering)
INSERT INTO users (sub, email, full_name, role_id, department_id, created_at, updated_at)
SELECT 'member-eng-1-sub', 'member1.eng@company.com', 'Member One (Eng)',
       (SELECT role_id FROM roles WHERE role_name='member' AND level='unit' LIMIT 1),
       (SELECT department_id FROM departments WHERE d_name='Engineering' LIMIT 1), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='member1.eng@company.com');

INSERT INTO users (sub, email, full_name, role_id, department_id, created_at, updated_at)
SELECT 'member-eng-2-sub', 'member2.eng@company.com', 'Member Two (Eng)',
       (SELECT role_id FROM roles WHERE role_name='member' AND level='unit' LIMIT 1),
       (SELECT department_id FROM departments WHERE d_name='Engineering' LIMIT 1), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='member2.eng@company.com');

-- CYCLES
INSERT INTO cycles (cycle_name, start_date, end_date, status, description, created_at, updated_at)
SELECT '2025 Q4', '2025-10-01 00:00:00', '2025-12-31 23:59:59', 'active', 'Chu kỳ Quý 4 năm 2025', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE cycle_name='2025 Q4');

INSERT INTO cycles (cycle_name, start_date, end_date, status, description, created_at, updated_at)
SELECT '2026 Q1', '2026-01-01 00:00:00', '2026-03-31 23:59:59', 'inactive', 'Chu kỳ Quý 1 năm 2026', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM cycles WHERE cycle_name='2026 Q1');

-- OBJECTIVES (Engineering)
-- Manager objective
INSERT INTO objectives (obj_title, level, description, status, progress_percent, user_id, cycle_id, department_id, created_at, updated_at)
SELECT 'Nâng chất lượng sản phẩm', 'unit', 'Cải thiện chất lượng thông qua QA automation', 'active', 0,
       (SELECT user_id FROM users WHERE email='manager.eng@company.com' LIMIT 1),
       (SELECT cycle_id FROM cycles WHERE cycle_name='2025 Q4' LIMIT 1),
       (SELECT department_id FROM departments WHERE d_name='Engineering' LIMIT 1), NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM objectives WHERE obj_title='Nâng chất lượng sản phẩm' AND cycle_id=(SELECT cycle_id FROM cycles WHERE cycle_name='2025 Q4' LIMIT 1)
);

-- Member objective
INSERT INTO objectives (obj_title, level, description, status, progress_percent, user_id, cycle_id, department_id, created_at, updated_at)
SELECT 'Tối ưu hiệu năng module A', 'person', 'Giảm thời gian phản hồi 30%', 'active', 0,
       (SELECT user_id FROM users WHERE email='member1.eng@company.com' LIMIT 1),
       (SELECT cycle_id FROM cycles WHERE cycle_name='2025 Q4' LIMIT 1),
       (SELECT department_id FROM departments WHERE d_name='Engineering' LIMIT 1), NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM objectives WHERE obj_title='Tối ưu hiệu năng module A' AND user_id=(SELECT user_id FROM users WHERE email='member1.eng@company.com' LIMIT 1)
);

-- KEY RESULTS for manager objective
INSERT INTO key_results (kr_title, target_value, current_value, unit, status, weight, progress_percent, objective_id, cycle_id, created_at, updated_at)
SELECT 'Tăng coverage test lên 80%', 80, 40, 'percent', 'active', 40, 50,
       (SELECT objective_id FROM objectives WHERE obj_title='Nâng chất lượng sản phẩm' LIMIT 1),
       (SELECT cycle_id FROM cycles WHERE cycle_name='2025 Q4' LIMIT 1), NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM key_results WHERE kr_title='Tăng coverage test lên 80%'
);

INSERT INTO key_results (kr_title, target_value, current_value, unit, status, weight, progress_percent, objective_id, cycle_id, created_at, updated_at)
SELECT 'Giảm bug production 50%', 50, 10, 'percent', 'active', 60, 20,
       (SELECT objective_id FROM objectives WHERE obj_title='Nâng chất lượng sản phẩm' LIMIT 1),
       (SELECT cycle_id FROM cycles WHERE cycle_name='2025 Q4' LIMIT 1), NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM key_results WHERE kr_title='Giảm bug production 50%'
);

-- KEY RESULTS for member objective
INSERT INTO key_results (kr_title, target_value, current_value, unit, status, weight, progress_percent, objective_id, cycle_id, created_at, updated_at)
SELECT 'Giảm P95 response từ 800ms xuống 500ms', 800, 600, 'number', 'active', 50, 25,
       (SELECT objective_id FROM objectives WHERE obj_title='Tối ưu hiệu năng module A' LIMIT 1),
       (SELECT cycle_id FROM cycles WHERE cycle_name='2025 Q4' LIMIT 1), NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM key_results WHERE kr_title='Giảm P95 response từ 800ms xuống 500ms'
);

INSERT INTO key_results (kr_title, target_value, current_value, unit, status, weight, progress_percent, objective_id, cycle_id, created_at, updated_at)
SELECT 'Giảm CPU usage trung bình 20%', 20, 5, 'percent', 'active', 50, 25,
       (SELECT objective_id FROM objectives WHERE obj_title='Tối ưu hiệu năng module A' LIMIT 1),
       (SELECT cycle_id FROM cycles WHERE cycle_name='2025 Q4' LIMIT 1), NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM key_results WHERE kr_title='Giảm CPU usage trung bình 20%'
);
