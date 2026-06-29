ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_sessions REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_sessions') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions';
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.chat_sessions TO anon;
GRANT SELECT, INSERT ON public.chat_messages TO anon;

DROP POLICY IF EXISTS "anon can read sessions" ON public.chat_sessions;
CREATE POLICY "anon can read sessions" ON public.chat_sessions FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon can insert sessions" ON public.chat_sessions;
CREATE POLICY "anon can insert sessions" ON public.chat_sessions FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "anon can update sessions" ON public.chat_sessions;
CREATE POLICY "anon can update sessions" ON public.chat_sessions FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "anon can read messages" ON public.chat_messages;
CREATE POLICY "anon can read messages" ON public.chat_messages FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon can insert messages" ON public.chat_messages;
CREATE POLICY "anon can insert messages" ON public.chat_messages FOR INSERT TO anon WITH CHECK (true);