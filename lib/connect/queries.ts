import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicUrl } from "@/lib/storage";
import type { AuthContext } from "@/lib/guards/withAuth";
import type { CommentRow, PostRow, PostType, ProfileRow, TagRow } from "@/types/database";

export interface ConnectAuthor {
  id: string;
  name: string;
  organization: string | null;
  position: string | null;
  photo_url: string | null;
}

export interface PostListItem {
  id: string;
  title: string;
  body: string;
  post_type: PostType;
  external_url: string | null;
  created_at: string;
  author: ConnectAuthor | null;
  tags: TagRow[];
  like_count: number;
  comment_count: number;
  is_liked: boolean;
}

export interface CommentListItem {
  id: string;
  body: string;
  created_at: string;
  author: ConnectAuthor | null;
}

const POST_SELECT =
  "id,author_id,title,body,post_type,external_url,status,created_at,updated_at";

export async function listPublishedPosts(
  me: AuthContext,
  limit = 30,
): Promise<PostListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("posts")
    .select(POST_SELECT)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`[posts] 목록 조회 실패: ${error.message}`);
  return shapePosts(me, (data ?? []) as PostRow[]);
}

export async function listPostsByProfile(
  me: AuthContext,
  profileId: string,
  limit = 5,
): Promise<PostListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("posts")
    .select(POST_SELECT)
    .eq("status", "published")
    .eq("author_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`[posts] 프로필 글 조회 실패: ${error.message}`);
  return shapePosts(me, (data ?? []) as PostRow[]);
}

export async function listComments(postId: string): Promise<CommentListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("comments")
    .select("id,post_id,author_id,body,status,created_at,updated_at")
    .eq("post_id", postId)
    .eq("status", "published")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(`[comments] 목록 조회 실패: ${error.message}`);

  const rows = (data ?? []) as CommentRow[];
  const authors = await fetchAuthors(rows.map((row) => row.author_id));
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    created_at: row.created_at,
    author: authors.get(row.author_id) ?? null,
  }));
}

async function shapePosts(
  me: AuthContext,
  posts: PostRow[],
): Promise<PostListItem[]> {
  if (posts.length === 0) return [];

  const postIds = posts.map((post) => post.id);
  const authorIds = posts.map((post) => post.author_id);

  const [authors, tags, likes, comments, liked] = await Promise.all([
    fetchAuthors(authorIds),
    fetchPostTags(postIds),
    fetchCounts("post_likes", postIds),
    fetchCounts("comments", postIds),
    fetchLikedSet(me.profile.id, postIds),
  ]);

  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    body: post.body,
    post_type: post.post_type,
    external_url: post.external_url,
    created_at: post.created_at,
    author: authors.get(post.author_id) ?? null,
    tags: tags.get(post.id) ?? [],
    like_count: likes.get(post.id) ?? 0,
    comment_count: comments.get(post.id) ?? 0,
    is_liked: liked.has(post.id),
  }));
}

async function fetchAuthors(ids: string[]): Promise<Map<string, ConnectAuthor>> {
  const map = new Map<string, ConnectAuthor>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return map;

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id,name,organization,position,photo_path")
    .in("id", unique);

  for (const profile of (data ?? []) as Pick<
    ProfileRow,
    "id" | "name" | "organization" | "position" | "photo_path"
  >[]) {
    map.set(profile.id, {
      id: profile.id,
      name: profile.name,
      organization: profile.organization,
      position: profile.position,
      photo_url: profile.photo_path ? getPublicUrl(profile.photo_path) : null,
    });
  }
  return map;
}

async function fetchPostTags(postIds: string[]): Promise<Map<string, TagRow[]>> {
  const map = new Map<string, TagRow[]>();
  if (postIds.length === 0) return map;

  const admin = createAdminClient();
  const { data } = await admin
    .from("post_tags")
    .select("post_id, tags(id,name,category)")
    .in("post_id", postIds);

  for (const row of (data ?? []) as Array<{
    post_id: string;
    tags: TagRow | TagRow[] | null;
  }>) {
    const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
    if (!tag) continue;
    const list = map.get(row.post_id) ?? [];
    list.push(tag);
    map.set(row.post_id, list);
  }
  return map;
}

async function fetchCounts(
  table: "post_likes" | "comments",
  postIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (postIds.length === 0) return map;

  const admin = createAdminClient();
  const { data } =
    table === "comments"
      ? await admin
          .from("comments")
          .select("post_id")
          .in("post_id", postIds)
          .eq("status", "published")
      : await admin.from("post_likes").select("post_id").in("post_id", postIds);

  for (const row of (data ?? []) as Array<{ post_id: string }>) {
    map.set(row.post_id, (map.get(row.post_id) ?? 0) + 1);
  }
  return map;
}

async function fetchLikedSet(
  profileId: string,
  postIds: string[],
): Promise<Set<string>> {
  const set = new Set<string>();
  if (postIds.length === 0) return set;

  const admin = createAdminClient();
  const { data } = await admin
    .from("post_likes")
    .select("post_id")
    .eq("profile_id", profileId)
    .in("post_id", postIds);

  for (const row of (data ?? []) as Array<{ post_id: string }>) {
    set.add(row.post_id);
  }
  return set;
}
