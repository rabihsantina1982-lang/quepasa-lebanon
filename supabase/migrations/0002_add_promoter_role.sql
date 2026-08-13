-- The promoter system (become-a-promoter, admin approval, /promoter dashboard)
-- has always checked for role = 'promoter', but the user_role enum from
-- 0001_init.sql only ever defined 'user' and 'admin'. Add the missing value.
alter type user_role add value 'promoter';
