import os
import psycopg2
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# --- Configurations ---
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")

def restore_neo4j():
    print("🌐 Connecting to Neo4j to build Graph Schema...")
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
        with driver.session() as session:
            # Create constraints to ensure fast MERGE operations and prevent duplicates
            queries = [
                "CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (c:NoteChunk) REQUIRE c.id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (m:MasterTopic) REQUIRE m.id IS UNIQUE"
            ]
            for q in queries:
                session.run(q)
        print("✅ Neo4j constraints applied successfully!")
        driver.close()
    except Exception as e:
        print(f"❌ Neo4j Error: {e}")

def restore_supabase():
    print("🐘 Connecting to Postgres to build Relational Schema...")
    if not SUPABASE_DB_URL:
        print("❌ Error: SUPABASE_DB_URL is missing from .env")
        return

    try:
        # Connect directly to Postgres
        conn = psycopg2.connect(SUPABASE_DB_URL)
        cursor = conn.cursor()

        # The Master SQL Payload
        sql_schema = """
        -- 0. Enable Vector Extension for Embeddings
        CREATE EXTENSION IF NOT EXISTS vector;

        -- 1. Profiles (Tied to Supabase Auth)
        CREATE TABLE IF NOT EXISTS public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            reputation INT DEFAULT 0,
            full_name TEXT,
            avatar_url TEXT
        );

        -- 2. Classes (Top Level Hierarchy)
        CREATE TABLE IF NOT EXISTS public.classes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            join_code TEXT UNIQUE NOT NULL,
            created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );

        -- 3. Class Memberships (Join Table)
        CREATE TABLE IF NOT EXISTS public.class_members (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            role TEXT DEFAULT 'student',
            status TEXT DEFAULT 'approved',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            UNIQUE(class_id, user_id)
        );

        -- 4. Courses
        CREATE TABLE IF NOT EXISTS public.courses (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            semester TEXT NOT NULL,
            created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );

        -- 5. Chapters
        CREATE TABLE IF NOT EXISTS public.chapters (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );

        -- 6. Notes (Parent Document)
        CREATE TABLE IF NOT EXISTS public.notes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            is_flagged BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );

        -- 7. Note Chunks (Vector Data)
        CREATE TABLE IF NOT EXISTS public.note_chunks (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            embedding vector(768),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );

        -- 8. Master Notes (AI Synthesis)
        CREATE TABLE IF NOT EXISTS public.master_notes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            content TEXT NOT NULL,
            chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );

        -- 9. Ghost Notes (AI Identified Gaps)
        CREATE TABLE IF NOT EXISTS public.ghost_notes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );

        -- 10. God Notes (Course Summaries)
        CREATE TABLE IF NOT EXISTS public.god_notes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );

        -- 11. Unblock RLS for seamless AI processing
        ALTER TABLE public.god_notes DISABLE ROW LEVEL SECURITY;
        ALTER TABLE public.ghost_notes DISABLE ROW LEVEL SECURITY;
        ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

        -- 12. Auto-Profile Trigger for New Signups
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger AS $$
        BEGIN
          INSERT INTO public.profiles (id, full_name, avatar_url, reputation)
          VALUES (new.id, split_part(new.email, '@', 1), '', 0);
          RETURN new;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

        -- 13. RPC Function: Increment Reputation
        CREATE OR REPLACE FUNCTION increment_reputation(user_id UUID, amount INT)
        RETURNS void AS $$
        BEGIN
            UPDATE public.profiles
            SET reputation = reputation + amount
            WHERE id = user_id;
        END;
        $$ LANGUAGE plpgsql;
        """

        # Execute the transaction
        cursor.execute(sql_schema)
        conn.commit()

        # Reload PostgREST schema cache so the API recognizes the new tables instantly
        cursor.execute("NOTIFY pgrst, 'reload schema';")
        conn.commit()

        cursor.close()
        conn.close()
        print("✅ Supabase tables, triggers, and vector extensions built successfully!")

    except Exception as e:
        print(f"❌ Supabase Connection Error: {e}")

if __name__ == "__main__":
    print("🏗️ INITATING SYNAPSE ARCHITECTURE BUILD 🏗️")
    restore_neo4j()
    restore_supabase()
    print("🚀 Architecture online. You are ready to upload.")