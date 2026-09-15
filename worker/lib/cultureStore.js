export function cultureStore(db) {
  const decode = row => {
    if (!row) return null
    const data = JSON.parse(row.data)
    delete data._writeToken
    return { ...data, id: row.id, ownerUserId: row.owner_user_id, authorName: row.author_name,
      createdAt: row.created_at, updatedAt: row.updated_at, tagIds: JSON.parse(row.tag_ids || '[]') }
  }
  const select = `SELECT p.*, (SELECT json_group_array(tag_id) FROM culture_post_tags WHERE post_id = p.id) AS tag_ids FROM culture_posts p`
  return {
    tags: async () => (await db.prepare('SELECT id, name FROM culture_tags ORDER BY name COLLATE NOCASE').all()).results,
    posts: async () => (await db.prepare(`${select} ORDER BY p.created_at DESC, p.id DESC`).all()).results.map(decode),
    post: async id => decode(await db.prepare(`${select} WHERE p.id = ?`).bind(id).first()),
    savePost: async (post, create, previousUpdate) => {
      const { id, ownerUserId, authorName, createdAt, updatedAt, tagIds, ...data } = post
      // A unique token keeps the tag statements tied to this exact update,
      // including concurrent writes that happen in the same millisecond.
      const token = crypto.randomUUID()
      data._writeToken = token
      const statements = [create
        ? db.prepare('INSERT INTO culture_posts (id, owner_user_id, author_name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, ownerUserId, authorName, JSON.stringify(data), createdAt, updatedAt)
        : db.prepare('UPDATE culture_posts SET data = ?, updated_at = ? WHERE id = ? AND updated_at = ?').bind(JSON.stringify(data), updatedAt, id, previousUpdate),
      db.prepare("DELETE FROM culture_post_tags WHERE post_id = ? AND EXISTS (SELECT 1 FROM culture_posts WHERE id = ? AND json_extract(data, '$._writeToken') = ?)").bind(id, id, token),
      ...tagIds.map(tag => db.prepare("INSERT INTO culture_post_tags (post_id, tag_id) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM culture_posts WHERE id = ? AND json_extract(data, '$._writeToken') = ?)").bind(id, tag, id, token))]
      const result = await db.batch(statements)
      if (!create && !result[0].meta.changes) throw Object.assign(new Error('Cette contribution a changé. Recharge-la avant de modifier à nouveau.'), { status: 409 })
    },
    deletePost: id => db.prepare('DELETE FROM culture_posts WHERE id = ?').bind(id).run(),
    saveTag: (tag, create) => create
      ? db.prepare('INSERT INTO culture_tags (id, name) VALUES (?, ?)').bind(tag.id, tag.name).run()
      : db.prepare('UPDATE culture_tags SET name = ? WHERE id = ?').bind(tag.name, tag.id).run(),
    deleteTag: id => db.prepare('DELETE FROM culture_tags WHERE id = ?').bind(id).run(),
  }
}
