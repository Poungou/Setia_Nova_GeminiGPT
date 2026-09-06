// src/components/ClanComposer/ClanComposer.jsx
//
// Refonte création/édition de clan (voir claude/clan-composer-redesign.md) :
// remplace le formulaire brut + la simple liste de membres par une
// expérience où l'utilisatrice COMPOSE son clan plutôt que remplit une
// fiche technique. Rendu uniquement depuis /compte (AccountApp.jsx), pour
// la collection `clans`, à la place du rendu générique de champs.
//
// Rien de nouveau côté données : on continue d'utiliser EXACTEMENT ce qui
// existait déjà —
//   - identité du clan       -> mêmes champs SCHEMA.clans (Field générique)
//   - membres                -> même table clan_members, mêmes appels
//                                accountApi (getClanMembers/addClanMember/
//                                removeClanMember), juste une présentation
//                                visuelle au lieu d'un <select> + liste brute
//   - liens / sociogramme    -> même champ `character.relations[]` que
//                                l'éditeur historique (RelationsInput dans
//                                src/admin/Fields.jsx) ; l'éditeur visuel
//                                ci-dessous écrit simplement des DEUX côtés
//                                en une seule action au lieu de forcer à
//                                ouvrir les deux fiches personnage
//                                séparément (voir CONTENT_GUIDE.md)
//   - personnage central     -> même champ `clan.centerCharacterId`
//
// Aucune route serveur, aucune migration : tout passe par les endpoints de
// compte déjà existants (updateAccountRow('characters', ...) et
// add/removeClanMember), donc worker/routes/account.js et
// plugins/woltar-account.js n'ont pas besoin d'être modifiés.
import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2, X, Pencil } from 'lucide-react'
import { Field } from '../../admin/Fields.jsx'
import { SCHEMA } from '../../admin/schema.js'
import { imgSrc, imgFocus } from '../../lib/image.js'
import { RELATION_LINK_TYPES, removeRelation, upsertRelation } from '../../lib/relations.js'
import { addClanMember, getClanMembers, removeClanMember, updateAccountRow } from '../../lib/accountApi.js'
import RelationGraph from '../RelationGraph/RelationGraph.jsx'
import { collectEdges } from '../../lib/relations.js'
import './ClanComposer.css'

function fullName(c) {
  return [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.id || ''
}

function initials(c) {
  return ((c?.firstName?.[0] || '') + (c?.lastName?.[0] || '')).toUpperCase()
}

function MiniPortrait({ character, size = 'md' }) {
  const src = character ? imgSrc(character.portrait) : ''
  return (
    <span className={`clan-mini-portrait clan-mini-portrait--${size}`}>
      {src ? (
        <img src={src} alt="" style={{ objectPosition: imgFocus(character.portrait) }} />
      ) : (
        <span className="clan-mini-portrait__initials">{character ? initials(character) : '?'}</span>
      )}
    </span>
  )
}

// ---------------------------------------------------------------------
// Bloc A — identité du clan : mêmes champs qu'avant (SCHEMA.clans, moins
// `members` déjà accountHidden et `centerCharacterId` retiré ici pour
// vivre dans le Bloc D à la place), regroupés en sous-sections compactes
// au lieu d'un long formulaire vertical. Le champ Emblème (type "image")
// garde son aperçu immédiat existant (voir ImageInput dans Fields.jsx).
// ---------------------------------------------------------------------
function ClanIdentityBlock({ fieldGroups, form, setField, data, disabled }) {
  return (
    <section className="clan-block clan-block--identity">
      <h2 className="clan-block__title">Identité du clan</h2>
      <div className="clan-identity__groups">
        {Object.entries(fieldGroups).map(([group, groupFields]) => (
          <fieldset key={group} className="adm-fieldset clan-identity__group">
            <legend>{group}</legend>
            {groupFields.map((field) => (
              <div key={field.key} className={`adm-field adm-field--${field.type}`}>
                <label htmlFor={`f-${field.key}`}>{field.label}</label>
                {field.hint && <p className="adm-hint">{field.hint}</p>}
                <Field
                  field={field}
                  value={form[field.key]}
                  onChange={(value) => setField(field.key, value)}
                  allData={data}
                  disabled={disabled}
                  uploadEnabled={import.meta.env.DEV && !disabled}
                />
              </div>
            ))}
          </fieldset>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Bloc B — membres : cartes visuelles (portrait + nom) au lieu du couple
// <select> + liste. Même logique de rattachement que l'ancien
// ClanMembersEditor (POST/DELETE sur /collections/clans/:id/members) — un
// membre ne peut être choisi que parmi les personnages déjà visibles pour
// ce compte (le serveur revérifie de toute façon), et le retirer du clan
// ne supprime JAMAIS le personnage lui-même.
// ---------------------------------------------------------------------
function ClanMembersBlock({ clanId, data, user, memberRows, setMemberRows, disabled }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setMemberRows(await getClanMembers(clanId))
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clanId])

  const members = useMemo(
    () => memberRows.map((m) => (data?.characters || []).find((c) => c.id === m.characterId)).filter(Boolean),
    [memberRows, data],
  )

  const candidates = useMemo(() => {
    const list = (data?.characters || []).filter(
      (c) => (user.role === 'admin' || c.ownerUserId === user.id) && !memberRows.some((m) => m.characterId === c.id),
    )
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => fullName(c).toLowerCase().includes(q))
  }, [data, user, memberRows, query])

  const onAdd = async (characterId) => {
    try {
      setError('')
      await addClanMember(clanId, { characterId, order: memberRows.length })
      setQuery('')
      await load()
    } catch (e) {
      setError(String(e.message || e))
    }
  }

  const onRemove = async (characterId) => {
    try {
      setError('')
      await removeClanMember(clanId, characterId)
      await load()
    } catch (e) {
      setError(String(e.message || e))
    }
  }

  return (
    <section className="clan-block clan-block--members">
      <h2 className="clan-block__title">Membres</h2>
      {error && <div className="adm-banner adm-banner--error">{error}</div>}
      {loading ? (
        <p className="adm-muted">Chargement…</p>
      ) : (
        <ul className="clan-member-grid">
          {members.map((m) => (
            <li key={m.id} className="clan-member-card">
              <MiniPortrait character={m} size="lg" />
              <strong className="clan-member-card__name">{fullName(m)}</strong>
              <button
                type="button"
                className="adm-btn adm-btn--danger clan-member-card__remove"
                onClick={() => onRemove(m.id)}
                disabled={disabled}
                aria-label={`Retirer ${fullName(m)} du clan`}
              >
                <Trash2 size={14} /> Retirer
              </button>
            </li>
          ))}
          {members.length === 0 && <li className="adm-muted">Aucun membre pour le moment.</li>}
        </ul>
      )}

      {adding ? (
        <div className="clan-member-add">
          {candidates.length > 6 && (
            <div className="clan-member-add__search">
              <Search size={14} aria-hidden="true" />
              <input
                className="adm-input"
                placeholder="Chercher un personnage…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={disabled}
              />
            </div>
          )}
          <ul className="clan-member-grid clan-member-grid--candidates">
            {candidates.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="clan-member-card clan-member-card--candidate"
                  onClick={() => onAdd(c.id)}
                  disabled={disabled}
                >
                  <MiniPortrait character={c} size="md" />
                  <span className="clan-member-card__name">{fullName(c)}</span>
                </button>
              </li>
            ))}
            {candidates.length === 0 && (
              <li className="adm-muted">
                {user.role === 'admin'
                  ? 'Aucun autre personnage disponible.'
                  : 'Crée d’abord un personnage dans « Mes personnages » pour pouvoir l’ajouter à ce clan.'}
              </li>
            )}
          </ul>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setAdding(false)}>
            <X size={14} /> Fermer
          </button>
        </div>
      ) : (
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setAdding(true)} disabled={disabled}>
          <Plus size={15} /> Ajouter un membre
        </button>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------
// Bloc C — éditeur visuel de liens. Une « relation » reste exactement
// {characterId, type, description, nature, intensity} sur
// character.relations[] (voir src/lib/relations.js) : cet éditeur écrit
// simplement des DEUX côtés d'un coup, avec un libellé par sens (souvent
// identique, parfois pas — ex. Père / Fils) au lieu de forcer à ouvrir
// séparément les deux fiches personnage.
// ---------------------------------------------------------------------
function emptyDraft(members) {
  return {
    editingKey: null,
    aId: members[0]?.id || '',
    bId: members[1]?.id || '',
    category: 'famille',
    labelAB: RELATION_LINK_TYPES[0].label,
    labelBA: RELATION_LINK_TYPES[0].reciprocal,
  }
}

function ClanRelationsBlock({ members, data, reload, disabled }) {
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const byId = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])
  const edges = useMemo(() => collectEdges(members), [members])

  const applyCategory = (categoryId, current) => {
    const cat = RELATION_LINK_TYPES.find((c) => c.id === categoryId) || RELATION_LINK_TYPES[RELATION_LINK_TYPES.length - 1]
    return { ...current, category: categoryId, labelAB: cat.label, labelBA: cat.reciprocal }
  }

  const startCreate = () => {
    setError('')
    setDraft(emptyDraft(members))
  }

  const startEdit = (edge) => {
    setError('')
    setDraft({
      editingKey: edge.key,
      aId: edge.a,
      bId: edge.b,
      category: 'autre',
      labelAB: edge.fromA?.type || '',
      labelBA: edge.fromB?.type || '',
    })
  }

  const cancel = () => {
    setDraft(null)
    setError('')
  }

  const saveCharacterRelation = async (characterId, otherId, label, { keepExtras = true } = {}) => {
    const existingChar = (data?.characters || []).find((c) => c.id === characterId)
    if (!existingChar) throw new Error('Personnage introuvable.')
    const base = { ...SCHEMA.characters.defaults, ...existingChar }
    const nextRelations = upsertRelation(base.relations, otherId, label, { keepExtras })
    await updateAccountRow('characters', characterId, { ...base, relations: nextRelations })
  }

  const removeCharacterRelation = async (characterId, otherId) => {
    const existingChar = (data?.characters || []).find((c) => c.id === characterId)
    if (!existingChar) return
    const base = { ...SCHEMA.characters.defaults, ...existingChar }
    await updateAccountRow('characters', characterId, { ...base, relations: removeRelation(base.relations, otherId) })
  }

  const onSave = async () => {
    if (!draft.aId || !draft.bId || draft.aId === draft.bId) {
      setError('Choisis deux personnages différents.')
      return
    }
    if (!draft.labelAB.trim()) {
      setError('Le libellé du lien ne peut pas être vide.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await saveCharacterRelation(draft.aId, draft.bId, draft.labelAB.trim())
      try {
        await saveCharacterRelation(draft.bId, draft.aId, (draft.labelBA || draft.labelAB).trim())
      } catch (e2) {
        setError(
          `Lien enregistré du côté de ${fullName(byId[draft.aId])}. Le réciproque côté ${fullName(byId[draft.bId])} n’a pas pu être écrit (${e2.message || e2}) — ce personnage appartient peut-être à un autre compte.`,
        )
      }
      await reload()
      setDraft(null)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (edge) => {
    setSaving(true)
    setError('')
    try {
      await Promise.allSettled([removeCharacterRelation(edge.a, edge.b), removeCharacterRelation(edge.b, edge.a)])
      await reload()
      setDraft(null)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setSaving(false)
    }
  }

  const linkableMembers = members

  return (
    <section className="clan-block clan-block--relations">
      <h2 className="clan-block__title">Liens entre les membres</h2>
      <p className="adm-hint">
        Chaque lien créé ici est enregistré des deux côtés en une fois — plus besoin d’ouvrir séparément les deux
        fiches personnage.
      </p>
      {error && <div className="adm-banner adm-banner--error">{error}</div>}

      <ul className="clan-relation-list">
        {edges.map((edge) => {
          const a = byId[edge.a]
          const b = byId[edge.b]
          if (!a || !b) return null
          const label = edge.fromA?.type || edge.fromB?.type || '—'
          return (
            <li key={edge.key} className="clan-relation-row">
              <span className="clan-relation-row__pair">
                <MiniPortrait character={a} size="sm" /> <strong>{fullName(a)}</strong>
                <span className="clan-relation-row__label">{label}</span>
                <span aria-hidden="true">→</span>
                <MiniPortrait character={b} size="sm" /> <strong>{fullName(b)}</strong>
              </span>
              <span className="clan-relation-row__actions">
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => startEdit(edge)} disabled={disabled || saving}>
                  <Pencil size={14} /> Modifier
                </button>
                <button type="button" className="adm-btn adm-btn--danger" onClick={() => onDelete(edge)} disabled={disabled || saving}>
                  <Trash2 size={14} /> Supprimer
                </button>
              </span>
            </li>
          )
        })}
        {edges.length === 0 && <li className="adm-muted">Aucun lien renseigné pour le moment.</li>}
      </ul>

      {draft ? (
        <div className="clan-relation-draft">
          <div className="clan-relation-draft__row">
            <label className="clan-relation-draft__field">
              <span>Personnage A</span>
              <select
                className="adm-input"
                value={draft.aId}
                disabled={saving}
                onChange={(e) => setDraft((d) => ({ ...d, aId: e.target.value }))}
              >
                <option value="">— choisir —</option>
                {linkableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {fullName(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="clan-relation-draft__field">
              <span>Type de lien</span>
              <select
                className="adm-input"
                value={draft.category}
                disabled={saving}
                onChange={(e) => setDraft((d) => applyCategory(e.target.value, d))}
              >
                {RELATION_LINK_TYPES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="clan-relation-draft__field">
              <span>Personnage B</span>
              <select
                className="adm-input"
                value={draft.bId}
                disabled={saving}
                onChange={(e) => setDraft((d) => ({ ...d, bId: e.target.value }))}
              >
                <option value="">— choisir —</option>
                {linkableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {fullName(m)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="clan-relation-draft__row">
            <label className="clan-relation-draft__field">
              <span>Libellé {fullName(byId[draft.aId]) || 'A'} → {fullName(byId[draft.bId]) || 'B'}</span>
              <input
                className="adm-input"
                value={draft.labelAB}
                disabled={saving}
                onChange={(e) => setDraft((d) => ({ ...d, labelAB: e.target.value }))}
              />
            </label>
            <label className="clan-relation-draft__field">
              <span>Libellé {fullName(byId[draft.bId]) || 'B'} → {fullName(byId[draft.aId]) || 'A'} (optionnel)</span>
              <input
                className="adm-input"
                value={draft.labelBA}
                disabled={saving}
                onChange={(e) => setDraft((d) => ({ ...d, labelBA: e.target.value }))}
              />
            </label>
          </div>
          <div className="clan-relation-draft__actions">
            <button type="button" className="adm-btn adm-btn--primary" onClick={onSave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer le lien'}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={cancel} disabled={saving}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="adm-btn adm-btn--primary"
          onClick={startCreate}
          disabled={disabled || members.length < 2}
        >
          <Plus size={15} /> Ajouter un lien
        </button>
      )}
      {members.length < 2 && <p className="adm-hint">Ajoute au moins deux membres pour pouvoir créer un lien.</p>}
    </section>
  )
}

// ---------------------------------------------------------------------
// Bloc D — aperçu en direct du sociogramme + choix du personnage central.
// Réutilise RelationGraph tel quel (voir onNodeClick, ajout non-cassant) :
// cliquer un portrait dans l'aperçu le définit comme centre. Le <select>
// reste disponible juste en dessous, en repli accessible.
// ---------------------------------------------------------------------
function ClanPreviewBlock({ members, centerId, onSetCenter, disabled }) {
  return (
    <section className="clan-block clan-block--preview">
      <h2 className="clan-block__title">Aperçu du sociogramme</h2>
      {members.length < 2 ? (
        <p className="adm-muted">Ajoute au moins deux membres pour voir l’aperçu du sociogramme.</p>
      ) : (
        <>
          <p className="adm-hint">Clique un portrait pour le définir comme personnage central.</p>
          <div className="clan-preview__stage">
            <RelationGraph members={members} centerId={centerId} onNodeClick={onSetCenter} />
          </div>
          <label className="clan-preview__fallback">
            <span>Personnage central (repli)</span>
            <select
              className="adm-input"
              value={centerId || ''}
              disabled={disabled}
              onChange={(e) => onSetCenter(e.target.value)}
            >
              <option value="">— automatique —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {fullName(m)}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </section>
  )
}

export default function ClanComposer({ fieldGroups, form, setField, data, user, reload, isNew, clanId, disabled }) {
  const [memberRows, setMemberRows] = useState([])

  const members = useMemo(
    () => memberRows.map((m) => (data?.characters || []).find((c) => c.id === m.characterId)).filter(Boolean),
    [memberRows, data],
  )

  return (
    <div className="clan-composer">
      <ClanIdentityBlock fieldGroups={fieldGroups} form={form} setField={setField} data={data} disabled={disabled} />
      {isNew ? (
        <p className="adm-hint clan-composer__save-first">
          Enregistre d’abord l’identité du clan pour pouvoir ajouter des membres, des liens et choisir un
          personnage central.
        </p>
      ) : (
        <>
          <ClanMembersBlock
            clanId={clanId}
            data={data}
            user={user}
            memberRows={memberRows}
            setMemberRows={setMemberRows}
            disabled={disabled}
          />
          <ClanRelationsBlock members={members} data={data} reload={reload} disabled={disabled} />
          <ClanPreviewBlock
            members={members}
            centerId={form.centerCharacterId}
            onSetCenter={(id) => setField('centerCharacterId', id)}
            disabled={disabled}
          />
        </>
      )}
    </div>
  )
}
