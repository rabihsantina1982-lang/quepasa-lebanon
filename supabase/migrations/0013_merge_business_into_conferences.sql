-- Merge the "Business" category into "Conferences" and rename it
-- "Conferences & Expos": business events here are trade shows/expos (GITEX,
-- Horeca), which were already split inconsistently between the two.
-- Exhibitions stays for art, museums and consumer shows.

update events
set category_id = (select id from categories where slug = 'conferences')
where category_id = (select id from categories where slug = 'business');

update profiles
set interests = (
  select coalesce(jsonb_agg(distinct v), '[]'::jsonb)
  from jsonb_array_elements_text(interests || '["conferences"]'::jsonb) as t(v)
  where v <> 'business'
)
where interests ? 'business';

update categories
set name_i18n = name_i18n || '{"en":"Conferences & Expos","ar":"مؤتمرات ومعارض تجارية","fr":"Conférences & salons","es":"Conferencias y ferias","it":"Conferenze e fiere","hi":"सम्मेलन और एक्सपो","ur":"کانفرنسز اور ایکسپو","ru":"Конференции и экспо","ja":"カンファレンス・展示会","tl":"Mga Kumperensya at Expo","zh":"会议与展会"}'::jsonb
where slug = 'conferences';

delete from categories where slug = 'business';
