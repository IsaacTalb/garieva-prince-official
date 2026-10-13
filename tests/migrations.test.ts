import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("migrations preserve application identity, variant integrity, and deny browser access", async () => {
  const db = new PGlite();
  try {
    // Supabase-provided roles simulated in an isolated PostgreSQL engine.
    await db.exec("create role anon; create role authenticated; create role service_role;");
    const directory = new URL("../supabase/migrations/", import.meta.url);
    for (const name of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) {
      await db.exec(await readFile(new URL(name, directory), "utf8"));
    }
    const { rows: users } = await db.query<{ id: string; profile_visibility: string }>("insert into public.users(auth0_sub, email) values ('auth0|test', 'person@example.com') returning id, profile_visibility");
    assert.match(users[0].id, /^[0-9a-f-]{36}$/);
    assert.equal(users[0].profile_visibility, "private");
    await assert.rejects(db.query("insert into public.users(auth0_sub) values ('auth0|test')"));
    await assert.rejects(db.query("insert into public.users(auth0_sub,email) values ('auth0|other','PERSON@example.com')"));
    await assert.rejects(db.query("insert into public.user_roles(user_id,role) values (gen_random_uuid(),'admin')"));
    const { rows: products } = await db.query<{ id: string }>("insert into public.products(name,slug,currency,created_by) values ('Test piece','test-piece','USD',$1) returning id", [users[0].id]);
    await db.query("insert into public.product_variants(product_id,sku,size,color,price_minor,stock_on_hand) values ($1,'GP-TEST','S','Ink',100,2)", [products[0].id]);
    await assert.rejects(db.query("update public.product_variants set stock_reserved = 3"));
    await assert.rejects(db.query("update public.product_variants set stock_on_hand = -1"));
    await assert.rejects(db.query("insert into public.product_variants(product_id,sku,size,color,price_minor) values ($1,'OTHER','s','ink',100)", [products[0].id]));
    await assert.rejects(db.query("insert into public.drops(name,slug,status) values ('Test','test','active')"));
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from public.users"));
    await assert.rejects(db.query("select * from public.products"));
    await db.exec("reset role; set role authenticated");
    await assert.rejects(db.query("insert into public.user_roles(user_id,role) values ($1,'admin')", [users[0].id]));
    await db.exec("reset role");
    const { rows: tables } = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'");
    assert.equal(tables.length, 8);
    assert.equal(tables.every((table) => table.relrowsecurity), true);
  } finally {
    await db.close();
  }
});
