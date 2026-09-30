-- Separate "Theater" category for plays, musicals, dance shows and stand-up
-- comedy, next to "Arts & Culture" (museums, galleries, heritage, film).
-- Arts & Culture switches to a palette icon so the two don't share 🎭.
insert into categories (slug, name_i18n, icon)
select 'theater',
       '{"en":"Theater","ar":"مسرح","fr":"Théâtre","es":"Teatro","it":"Teatro","hi":"थिएटर","ur":"تھیٹر","ru":"Театр","ja":"演劇","tl":"Teatro","zh":"戏剧"}'::jsonb,
       '🎭'
where not exists (select 1 from categories where slug = 'theater');

update categories set icon = '🎨' where slug = 'arts_culture';
