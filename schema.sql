


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."cleanup_chat_messages"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Delete chat messages from inactive rooms older than 1 hour
  DELETE FROM watch_party_chat_messages
  WHERE room_id IN (
    SELECT id FROM watch_party_rooms 
    WHERE is_active = FALSE 
      AND last_activity_at < NOW() - INTERVAL '1 hour'
  );
  
  -- Delete old chat from active rooms (older than 7 days)
  DELETE FROM watch_party_chat_messages
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_chat_messages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_empty_rooms"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE watch_party_rooms
  SET is_active = FALSE
  WHERE id IN (
    SELECT r.id
    FROM watch_party_rooms r
    LEFT JOIN watch_party_participants p ON p.room_id = r.id AND p.is_connected = TRUE
    WHERE r.is_active = TRUE
    GROUP BY r.id
    HAVING COUNT(p.id) = 0
  );
END;
$$;


ALTER FUNCTION "public"."cleanup_empty_rooms"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_rooms"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE watch_party_rooms
  SET is_active = FALSE
  WHERE expires_at < NOW() AND is_active = TRUE;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_rooms"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_inactive_rooms"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE watch_party_rooms
  SET is_active = FALSE
  WHERE last_activity_at < NOW() - INTERVAL '2 hours'
    AND is_active = TRUE;
END;
$$;


ALTER FUNCTION "public"."cleanup_inactive_rooms"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_watch_party_room"("p_host_id" "uuid", "p_subject_id" "text", "p_subject_type" integer, "p_title" "text", "p_cover_url" "text" DEFAULT NULL::"text", "p_current_episode" integer DEFAULT 1) RETURNS TABLE("res_room_id" "uuid", "res_room_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_room_code TEXT;
  v_room_id UUID;
BEGIN
  -- Generate unique room code
  LOOP
    v_room_code := generate_room_code();
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM watch_party_rooms wpr WHERE wpr.room_code = v_room_code
    );
  END LOOP;
  
  -- Create room
  INSERT INTO watch_party_rooms (
    room_code, host_id, subject_id, subject_type, 
    title, cover_url, current_episode
  )
  VALUES (
    v_room_code, p_host_id, p_subject_id, p_subject_type,
    p_title, p_cover_url, p_current_episode
  )
  RETURNING id INTO v_room_id;
  
  -- Add host as first participant
  INSERT INTO watch_party_participants (
    room_id, user_id, display_name, is_host
  )
  SELECT 
    v_room_id, 
    p_host_id,
    COALESCE(profiles.full_name, users.email),
    TRUE
  FROM auth.users
  LEFT JOIN profiles ON profiles.id = users.id
  WHERE users.id = p_host_id;
  
  RETURN QUERY SELECT v_room_id AS res_room_id, v_room_code AS res_room_code;
END;
$$;


ALTER FUNCTION "public"."create_watch_party_room"("p_host_id" "uuid", "p_subject_id" "text", "p_subject_type" integer, "p_title" "text", "p_cover_url" "text", "p_current_episode" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_room_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_room_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_continue_watching"("p_user_id" "uuid", "p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "subject_id" "text", "subject_type" integer, "title" "text", "cover_url" "text", "current_episode" integer, "total_episodes" integer, "progress_seconds" integer, "duration_seconds" integer, "progress_percent" numeric, "last_watched_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wh.id,
    wh.subject_id,
    wh.subject_type,
    wh.title,
    wh.cover_url,
    wh.current_episode,
    wh.total_episodes,
    wh.progress_seconds,
    wh.duration_seconds,
    ROUND((wh.progress_seconds::DECIMAL / NULLIF(wh.duration_seconds, 0)) * 100, 2) as progress_percent,
    wh.last_watched_at
  FROM watch_history wh
  WHERE wh.user_id = p_user_id
    AND wh.completed = FALSE
    AND wh.progress_seconds > 0
  ORDER BY wh.last_watched_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_continue_watching"("p_user_id" "uuid", "p_limit" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."watch_party_rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_code" "text" NOT NULL,
    "host_id" "uuid" NOT NULL,
    "subject_id" "text" NOT NULL,
    "subject_type" integer NOT NULL,
    "title" "text" NOT NULL,
    "cover_url" "text",
    "current_episode" integer DEFAULT 1,
    "current_position" numeric DEFAULT 0,
    "is_playing" boolean DEFAULT false,
    "last_action_by" "uuid",
    "last_action_at" timestamp with time zone DEFAULT "now"(),
    "max_participants" integer DEFAULT 10,
    "allow_guest" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval),
    "last_activity_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."watch_party_rooms" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_watch_party_by_code"("p_code" "text") RETURNS SETOF "public"."watch_party_rooms"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM watch_party_rooms
  WHERE room_code = UPPER(p_code);
END;
$$;


ALTER FUNCTION "public"."get_watch_party_by_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_watch_party_room"("p_room_code" "text", "p_user_id" "uuid") RETURNS TABLE("res_success" boolean, "res_room_id" "uuid", "res_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_room_id UUID;
  v_is_active BOOLEAN;
  v_participant_count INT;
  v_max_participants INT;
BEGIN
  -- Get room info
  SELECT r.id, r.is_active, r.max_participants 
  INTO v_room_id, v_is_active, v_max_participants
  FROM watch_party_rooms r
  WHERE r.room_code = p_room_code;
  
  -- Check if room exists
  IF v_room_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Room not found';
    RETURN;
  END IF;
  
  -- Check if room is active
  IF NOT v_is_active OR NOW() > (SELECT r.expires_at FROM watch_party_rooms r WHERE r.id = v_room_id) THEN
    RETURN QUERY SELECT FALSE, v_room_id, 'Room has expired';
    RETURN;
  END IF;
  
  -- Check room capacity
  SELECT COUNT(*) INTO v_participant_count
  FROM watch_party_participants wpp
  WHERE wpp.room_id = v_room_id AND wpp.is_connected = TRUE;
  
  IF v_participant_count >= v_max_participants THEN
    RETURN QUERY SELECT FALSE, v_room_id, 'Room is full';
    RETURN;
  END IF;
  
  -- Add participant (or update if already exists)
  INSERT INTO watch_party_participants (
    room_id, user_id, display_name, is_connected
  )
  SELECT 
    v_room_id,
    p_user_id,
    COALESCE(profiles.full_name, users.email),
    TRUE
  FROM auth.users
  LEFT JOIN profiles ON profiles.id = users.id
  WHERE users.id = p_user_id
  ON CONFLICT (room_id, user_id) 
  DO UPDATE SET 
    is_connected = TRUE,
    last_seen_at = NOW();
  
  -- Update room activity
  UPDATE watch_party_rooms 
  SET last_activity_at = NOW() 
  WHERE id = v_room_id;
  
  RETURN QUERY SELECT TRUE, v_room_id, 'Successfully joined room';
END;
$$;


ALTER FUNCTION "public"."join_watch_party_room"("p_room_code" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_all_cleanups"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM cleanup_expired_rooms();
  PERFORM cleanup_inactive_rooms();
  PERFORM cleanup_empty_rooms();
  PERFORM cleanup_chat_messages();
END;
$$;


ALTER FUNCTION "public"."run_all_cleanups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_generic_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_generic_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_watch_history_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_watch_history_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_anime_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "anime_slug" "text" NOT NULL,
    "anime_title" "text",
    "is_followed" boolean DEFAULT false NOT NULL,
    "is_liked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_anime_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."watch_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subject_id" "text" NOT NULL,
    "subject_type" integer NOT NULL,
    "title" "text" NOT NULL,
    "cover_url" "text",
    "current_episode" integer DEFAULT 1,
    "total_episodes" integer,
    "progress_seconds" integer DEFAULT 0,
    "duration_seconds" integer NOT NULL,
    "completed" boolean DEFAULT false,
    "last_watched_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."watch_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."watch_history_anime" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "anime_slug" "text" NOT NULL,
    "title" "text",
    "cover_url" "text",
    "progress_percent" integer DEFAULT 0 NOT NULL,
    "watched_duration_sec" integer DEFAULT 0 NOT NULL,
    "estimated_duration_sec" integer DEFAULT 0 NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "watch_history_anime_progress_percent_check" CHECK ((("progress_percent" >= 0) AND ("progress_percent" <= 100)))
);


ALTER TABLE "public"."watch_history_anime" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."watch_party_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "display_name" "text" NOT NULL,
    "avatar_url" "text",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."watch_party_chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."watch_party_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "avatar_url" "text",
    "is_host" boolean DEFAULT false,
    "is_connected" boolean DEFAULT true,
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."watch_party_participants" OWNER TO "postgres";


ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_anime_preferences"
    ADD CONSTRAINT "user_anime_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_anime_preferences"
    ADD CONSTRAINT "user_anime_preferences_user_id_anime_slug_key" UNIQUE ("user_id", "anime_slug");



ALTER TABLE ONLY "public"."watch_history_anime"
    ADD CONSTRAINT "watch_history_anime_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."watch_history_anime"
    ADD CONSTRAINT "watch_history_anime_user_id_anime_slug_key" UNIQUE ("user_id", "anime_slug");



ALTER TABLE ONLY "public"."watch_history"
    ADD CONSTRAINT "watch_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."watch_history"
    ADD CONSTRAINT "watch_history_user_id_subject_id_current_episode_key" UNIQUE ("user_id", "subject_id", "current_episode");



ALTER TABLE ONLY "public"."watch_party_chat_messages"
    ADD CONSTRAINT "watch_party_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."watch_party_participants"
    ADD CONSTRAINT "watch_party_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."watch_party_participants"
    ADD CONSTRAINT "watch_party_participants_room_id_user_id_key" UNIQUE ("room_id", "user_id");



ALTER TABLE ONLY "public"."watch_party_rooms"
    ADD CONSTRAINT "watch_party_rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."watch_party_rooms"
    ADD CONSTRAINT "watch_party_rooms_room_code_key" UNIQUE ("room_code");



CREATE INDEX "idx_party_active" ON "public"."watch_party_rooms" USING "btree" ("is_active", "expires_at");



CREATE INDEX "idx_party_chat_room" ON "public"."watch_party_chat_messages" USING "btree" ("room_id", "created_at" DESC);



CREATE INDEX "idx_party_host" ON "public"."watch_party_rooms" USING "btree" ("host_id");



CREATE INDEX "idx_party_last_activity" ON "public"."watch_party_rooms" USING "btree" ("last_activity_at") WHERE ("is_active" = true);



CREATE INDEX "idx_party_participants_connected" ON "public"."watch_party_participants" USING "btree" ("room_id", "is_connected");



CREATE INDEX "idx_party_participants_room" ON "public"."watch_party_participants" USING "btree" ("room_id");



CREATE INDEX "idx_party_participants_user" ON "public"."watch_party_participants" USING "btree" ("user_id");



CREATE INDEX "idx_party_room_code" ON "public"."watch_party_rooms" USING "btree" ("room_code");



CREATE INDEX "idx_user_anime_preferences_recent" ON "public"."user_anime_preferences" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "idx_user_anime_preferences_user" ON "public"."user_anime_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_watch_history_anime_recent" ON "public"."watch_history_anime" USING "btree" ("user_id", "last_seen_at" DESC);



CREATE INDEX "idx_watch_history_anime_user" ON "public"."watch_history_anime" USING "btree" ("user_id");



CREATE INDEX "idx_watch_history_continuing" ON "public"."watch_history" USING "btree" ("user_id", "last_watched_at" DESC) WHERE ("completed" = false);



CREATE INDEX "idx_watch_history_last_watched" ON "public"."watch_history" USING "btree" ("user_id", "last_watched_at" DESC);



CREATE INDEX "idx_watch_history_subject" ON "public"."watch_history" USING "btree" ("subject_id");



CREATE INDEX "idx_watch_history_user" ON "public"."watch_history" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_profiles_updated_at"();



CREATE OR REPLACE TRIGGER "user_anime_preferences_updated_at" BEFORE UPDATE ON "public"."user_anime_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_generic_updated_at"();



CREATE OR REPLACE TRIGGER "watch_history_anime_updated_at" BEFORE UPDATE ON "public"."watch_history_anime" FOR EACH ROW EXECUTE FUNCTION "public"."update_generic_updated_at"();



CREATE OR REPLACE TRIGGER "watch_history_updated_at" BEFORE UPDATE ON "public"."watch_history" FOR EACH ROW EXECUTE FUNCTION "public"."update_watch_history_updated_at"();



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_anime_preferences"
    ADD CONSTRAINT "user_anime_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."watch_history_anime"
    ADD CONSTRAINT "watch_history_anime_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."watch_history"
    ADD CONSTRAINT "watch_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."watch_party_chat_messages"
    ADD CONSTRAINT "watch_party_chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."watch_party_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."watch_party_chat_messages"
    ADD CONSTRAINT "watch_party_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."watch_party_participants"
    ADD CONSTRAINT "watch_party_participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."watch_party_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."watch_party_participants"
    ADD CONSTRAINT "watch_party_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."watch_party_rooms"
    ADD CONSTRAINT "watch_party_rooms_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."watch_party_rooms"
    ADD CONSTRAINT "watch_party_rooms_last_action_by_fkey" FOREIGN KEY ("last_action_by") REFERENCES "auth"."users"("id");



CREATE POLICY "Host can delete own room" ON "public"."watch_party_rooms" FOR DELETE USING (("host_id" = "auth"."uid"()));



CREATE POLICY "Host can update own room" ON "public"."watch_party_rooms" FOR UPDATE USING (("host_id" = "auth"."uid"()));



CREATE POLICY "Insert chat in participating rooms" ON "public"."watch_party_chat_messages" FOR INSERT WITH CHECK (("room_id" IN ( SELECT "watch_party_participants"."room_id"
   FROM "public"."watch_party_participants"
  WHERE (("watch_party_participants"."user_id" = "auth"."uid"()) AND ("watch_party_participants"."is_connected" = true)))));



CREATE POLICY "Users can delete own anime preferences" ON "public"."user_anime_preferences" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own anime watch history" ON "public"."watch_history_anime" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own watch history" ON "public"."watch_history" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own anime preferences" ON "public"."user_anime_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own anime watch history" ON "public"."watch_history_anime" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own watch history" ON "public"."watch_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own anime preferences" ON "public"."user_anime_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own anime watch history" ON "public"."watch_history_anime" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own participation" ON "public"."watch_party_participants" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own watch history" ON "public"."watch_history" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own anime preferences" ON "public"."user_anime_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own anime watch history" ON "public"."watch_history_anime" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own watch history" ON "public"."watch_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view participating rooms" ON "public"."watch_party_rooms" FOR SELECT USING (("id" IN ( SELECT "watch_party_participants"."room_id"
   FROM "public"."watch_party_participants"
  WHERE ("watch_party_participants"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "View chat in participating rooms" ON "public"."watch_party_chat_messages" FOR SELECT USING (("room_id" IN ( SELECT "watch_party_participants"."room_id"
   FROM "public"."watch_party_participants"
  WHERE ("watch_party_participants"."user_id" = "auth"."uid"()))));



CREATE POLICY "View participants in same room" ON "public"."watch_party_participants" FOR SELECT USING (("room_id" IN ( SELECT "watch_party_participants_1"."room_id"
   FROM "public"."watch_party_participants" "watch_party_participants_1"
  WHERE ("watch_party_participants_1"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_anime_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."watch_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."watch_history_anime" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."watch_party_chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."watch_party_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."watch_party_rooms" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_chat_messages"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_chat_messages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_chat_messages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_empty_rooms"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_empty_rooms"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_empty_rooms"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_rooms"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_rooms"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_rooms"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_inactive_rooms"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_inactive_rooms"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_inactive_rooms"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_watch_party_room"("p_host_id" "uuid", "p_subject_id" "text", "p_subject_type" integer, "p_title" "text", "p_cover_url" "text", "p_current_episode" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_watch_party_room"("p_host_id" "uuid", "p_subject_id" "text", "p_subject_type" integer, "p_title" "text", "p_cover_url" "text", "p_current_episode" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_watch_party_room"("p_host_id" "uuid", "p_subject_id" "text", "p_subject_type" integer, "p_title" "text", "p_cover_url" "text", "p_current_episode" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_room_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_room_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_room_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_continue_watching"("p_user_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_continue_watching"("p_user_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_continue_watching"("p_user_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON TABLE "public"."watch_party_rooms" TO "anon";
GRANT ALL ON TABLE "public"."watch_party_rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."watch_party_rooms" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_watch_party_by_code"("p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_watch_party_by_code"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_watch_party_by_code"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."join_watch_party_room"("p_room_code" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."join_watch_party_room"("p_room_code" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_watch_party_room"("p_room_code" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."run_all_cleanups"() TO "anon";
GRANT ALL ON FUNCTION "public"."run_all_cleanups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_all_cleanups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_generic_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_generic_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_generic_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_profiles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_watch_history_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_watch_history_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_watch_history_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_anime_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_anime_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_anime_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."watch_history" TO "anon";
GRANT ALL ON TABLE "public"."watch_history" TO "authenticated";
GRANT ALL ON TABLE "public"."watch_history" TO "service_role";



GRANT ALL ON TABLE "public"."watch_history_anime" TO "anon";
GRANT ALL ON TABLE "public"."watch_history_anime" TO "authenticated";
GRANT ALL ON TABLE "public"."watch_history_anime" TO "service_role";



GRANT ALL ON TABLE "public"."watch_party_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."watch_party_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."watch_party_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."watch_party_participants" TO "anon";
GRANT ALL ON TABLE "public"."watch_party_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."watch_party_participants" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







