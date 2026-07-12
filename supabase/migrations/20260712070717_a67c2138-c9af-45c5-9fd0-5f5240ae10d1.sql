DO $$
DECLARE
  pol record;
BEGIN
  SELECT * INTO pol FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_own';
  IF FOUND THEN
    EXECUTE 'DROP POLICY profiles_update_own ON public.profiles';
    EXECUTE format(
      'CREATE POLICY profiles_update_own ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      pol.qual,
      COALESCE(pol.with_check, pol.qual)
    );
  END IF;
END $$;