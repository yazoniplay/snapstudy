-- Make every SnapStudy profile part of the community leaderboard by default.
alter table public.profiles alter column leaderboard_opt_in set default true;
update public.profiles set leaderboard_opt_in = true where leaderboard_opt_in is distinct from true;

-- Profiles contain only public leaderboard fields; all signed-in and public visitors
-- can read the public profile data needed to render the leaderboard.
drop policy if exists "Public leaderboard profiles are visible" on public.profiles;
create policy "Public leaderboard profiles are visible" on public.profiles for select using (true);
