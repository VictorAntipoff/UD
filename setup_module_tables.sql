INSERT INTO user_module_permissions (id, user_id, module_id, has_access)
VALUES (
    gen_random_uuid(),
    current_user_id,
    v_module_id,
    true
)
ON CONFLICT (user_id, module_id) DO UPDATE
SET has_access = true; 