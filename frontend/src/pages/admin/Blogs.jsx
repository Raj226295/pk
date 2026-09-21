import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDate } from '../../lib/formatters.js'

const initialBlogForm = {
  title: '',
  category: 'General',
  description: '',
  content: '',
  publishedAt: '',
}

function toDateInputValue(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10)
  }

  return new Date(value).toISOString().slice(0, 10)
}

function createBlogForm(blog = null) {
  if (!blog) {
    return {
      ...initialBlogForm,
      publishedAt: toDateInputValue(),
    }
  }

  return {
    title: blog.title || '',
    category: blog.category || 'General',
    description: blog.description || '',
    content: blog.content || '',
    publishedAt: toDateInputValue(blog.publishedAt || blog.createdAt),
  }
}

function Blogs() {
  const [blogs, setBlogs] = useState([])
  const [selectedBlogId, setSelectedBlogId] = useState('')
  const [form, setForm] = useState(createBlogForm())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const selectedBlog = useMemo(
    () => blogs.find((blog) => blog._id === selectedBlogId) || null,
    [blogs, selectedBlogId],
  )

  const loadBlogs = async () => {
    const { data } = await api.get('/api/admin/blogs')
    setBlogs(data.blogs || [])
  }

  useEffect(() => {
    loadBlogs()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const startCreate = () => {
    setSelectedBlogId('')
    setForm(createBlogForm())
    setStatus({ type: '', message: '' })
  }

  const startEdit = (blog) => {
    setSelectedBlogId(blog._id)
    setForm(createBlogForm(blog))
    setStatus({ type: '', message: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setStatus({ type: '', message: '' })

    try {
      const payload = {
        ...form,
        publishedAt: form.publishedAt ? `${form.publishedAt} 00:00:00` : '',
      }

      const successMessage = selectedBlog ? 'Blog updated successfully.' : 'Blog added successfully.'

      if (selectedBlog) {
        await api.patch(`/api/admin/blogs/${selectedBlog._id}`, payload)
      } else {
        await api.post('/api/admin/blogs', payload)
      }

      await loadBlogs()
      startCreate()
      setStatus({ type: 'success', message: successMessage })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (blog) => {
    if (!window.confirm(`Delete "${blog.title}"?`)) {
      return
    }

    setStatus({ type: '', message: '' })

    try {
      await api.delete(`/api/admin/blogs/${blog._id}`)
      await loadBlogs()
      if (selectedBlogId === blog._id) {
        startCreate()
      }
      setStatus({ type: 'success', message: 'Blog deleted successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  if (loading) {
    return <Loader message="Loading blogs..." />
  }

  return (
    <div className="dashboard-main">
      <PageHeader
        eyebrow="Admin blog"
        title="Blog management"
        description="Add, edit, and delete blog posts shown on the public blog page."
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="admin-blog-layout">
        <form className="form-panel admin-blog-form" onSubmit={handleSubmit}>
          <div className="section-head compact">
            <div>
              <span className="eyebrow">{selectedBlog ? 'Edit post' : 'New post'}</span>
              <h2>{selectedBlog ? selectedBlog.title : 'Create a blog post'}</h2>
            </div>
            {selectedBlog ? (
              <button className="button button-ghost button-compact" onClick={startCreate} type="button">
                New Blog
              </button>
            ) : null}
          </div>

          <label>
            Title
            <input name="title" onChange={handleChange} required type="text" value={form.title} />
          </label>

          <div className="form-grid">
            <label>
              Category
              <input name="category" onChange={handleChange} required type="text" value={form.category} />
            </label>
            <label>
              Published date
              <input name="publishedAt" onChange={handleChange} required type="date" value={form.publishedAt} />
            </label>
          </div>

          <label>
            Short description
            <textarea
              name="description"
              onChange={handleChange}
              required
              rows="3"
              value={form.description}
            />
          </label>

          <label>
            Blog content
            <textarea name="content" onChange={handleChange} required rows="12" value={form.content} />
          </label>

          <button className="button button-primary" disabled={saving} type="submit">
            {saving ? 'Saving...' : selectedBlog ? 'Update Blog' : 'Add Blog'}
          </button>
        </form>

        <div className="admin-blog-list">
          {!blogs.length ? (
            <EmptyState title="No blog posts yet" description="Create your first blog post from the form." />
          ) : null}

          {blogs.map((blog) => (
            <article className="info-card admin-blog-card" key={blog._id}>
              <span className="eyebrow">{blog.category || 'General'}</span>
              <h3>{blog.title}</h3>
              <p>{blog.description}</p>
              <small>
                {formatDate(blog.publishedAt || blog.createdAt)} | /blog/{blog.slug}
              </small>
              <div className="admin-blog-actions">
                <button className="button button-ghost button-compact" onClick={() => startEdit(blog)} type="button">
                  Edit
                </button>
                <button
                  className="button button-ghost button-compact danger-button"
                  onClick={() => handleDelete(blog)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Blogs
