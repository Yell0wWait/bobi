import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qxjpmtqncivzqvskyrgf.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4anBtdHFuY2l2enF2c2t5cmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNTExOTYsImV4cCI6MjA4MjYyNzE5Nn0.5sb9ONpFdqpLhUAzgFkepxfEnnFvJrzFY6MxGKKgyZ0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
