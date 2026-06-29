
-- chat_sessions: add per-session client token
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS client_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_chat_sessions_token ON public.chat_sessions(client_token);

DROP POLICY IF EXISTS "anon can read sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "anon can update sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "anon can insert sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "chat sessions public read" ON public.chat_sessions;
DROP POLICY IF EXISTS "chat sessions update" ON public.chat_sessions;
DROP POLICY IF EXISTS "chat sessions public insert" ON public.chat_sessions;

CREATE POLICY "chat sessions read scoped" ON public.chat_sessions FOR SELECT TO anon, authenticated
USING (
  client_token::text = NULLIF(current_setting('request.headers', true), '')::json->>'x-chat-token'
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "chat sessions insert scoped" ON public.chat_sessions FOR INSERT TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "chat sessions update scoped" ON public.chat_sessions FOR UPDATE TO anon, authenticated
USING (
  client_token::text = NULLIF(current_setting('request.headers', true), '')::json->>'x-chat-token'
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  client_token::text = NULLIF(current_setting('request.headers', true), '')::json->>'x-chat-token'
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- chat_messages
DROP POLICY IF EXISTS "anon can read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "anon can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "chat msgs public read" ON public.chat_messages;
DROP POLICY IF EXISTS "chat msgs public insert" ON public.chat_messages;

CREATE POLICY "chat msgs read scoped" ON public.chat_messages FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = chat_messages.session_id AND (
    s.client_token::text = NULLIF(current_setting('request.headers', true), '')::json->>'x-chat-token'
    OR (auth.uid() IS NOT NULL AND s.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  ))
);

CREATE POLICY "chat msgs insert scoped" ON public.chat_messages FOR INSERT TO anon, authenticated
WITH CHECK (
  sender IN ('user','system')
  AND EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = chat_messages.session_id AND (
    s.client_token::text = NULLIF(current_setting('request.headers', true), '')::json->>'x-chat-token'
    OR (auth.uid() IS NOT NULL AND s.user_id = auth.uid())
  ))
);

CREATE POLICY "chat msgs admin insert" ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND sender = 'admin');

-- incomplete_orders: remove client-side write surface; server functions use service role
DROP POLICY IF EXISTS "incomplete self/session update" ON public.incomplete_orders;
DROP POLICY IF EXISTS "incomplete public insert" ON public.incomplete_orders;

-- coupons: hide from public; server functions use service role for validation
DROP POLICY IF EXISTS "coupons public read active" ON public.coupons;
CREATE POLICY "coupons admin read" ON public.coupons FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Lock down SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_trashed_orders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_old_trashed_orders() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
