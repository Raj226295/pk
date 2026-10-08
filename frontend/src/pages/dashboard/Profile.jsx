import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserAvatar from '../../components/common/UserAvatar.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Icon } from '../public/Home.jsx'

const defaultImageSettings = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
}

function Profile() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [profileImage, setProfileImage] = useState(null)
  const profileImageInputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageSettings, setImageSettings] = useState(defaultImageSettings)
  const [imageInputKey, setImageInputKey] = useState(0)
  const [imageSubmitting, setImageSubmitting] = useState(false)
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [adminStats, setAdminStats] = useState({ services: 0, appointments: 0 })

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        companyName: user.companyName || '',
      })
      setImageSettings({
        zoom: user.profileImageZoom ?? 1,
        offsetX: user.profileImageOffsetX ?? 0,
        offsetY: user.profileImageOffsetY ?? 0,
      })
    }
  }, [user])

  useEffect(() => {
    if (user?.role !== 'admin') return
    api.get('/api/admin/overview').then(({ data }) => {
      const overview = data.overview || {}
      setAdminStats({
        services: (overview.activeServices || 0) + (overview.completedServices || 0),
        appointments: overview.totalAppointments || 0,
      })
    }).catch(() => {})
  }, [user?.role])

  useEffect(() => {
    if (!profileImage) {
      setPreviewUrl('')
      return
    }

    const nextPreviewUrl = URL.createObjectURL(profileImage)
    setPreviewUrl(nextPreviewUrl)

    return () => {
      URL.revokeObjectURL(nextPreviewUrl)
    }
  }, [profileImage])

  const handleProfileChange = (event) => {
    setProfileForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const handlePasswordChange = (event) => {
    setPasswordForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const handleImageChange = (event) => {
    const nextImage = event.target.files?.[0] || null
    if (nextImage && !['image/jpeg', 'image/png'].includes(nextImage.type)) {
      event.target.value = ''
      setProfileImage(null)
      setStatus({ type: 'error', message: 'Please choose a JPG or PNG image.' })
      return
    }
    if (nextImage && nextImage.size > 5 * 1024 * 1024) {
      event.target.value = ''
      setProfileImage(null)
      setStatus({ type: 'error', message: 'The profile photo must be 5 MB or smaller.' })
      return
    }
    setStatus({ type: '', message: '' })
    setProfileImage(nextImage)
  }

  const handleImageSettingChange = (event) => {
    const { name, value } = event.target

    setImageSettings((current) => ({
      ...current,
      [name]: Number(value),
    }))
  }

  const resetImageSettings = () => {
    setImageSettings(defaultImageSettings)
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    if (profileSubmitting || imageSubmitting) return
    setProfileSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      const { data } = await api.put('/api/user/profile', profileForm)
      updateUser(data.user)
      if (profileImage) {
        await persistProfileImage()
      }
      setStatus({ type: 'success', message: 'Profile updated successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setProfileSubmitting(false)
    }
  }

  const persistProfileImage = async () => {
    const payload = new FormData()
    if (profileImage) {
      payload.append('profileImage', profileImage)
    }
    payload.append('zoom', String(imageSettings.zoom))
    payload.append('offsetX', String(imageSettings.offsetX))
    payload.append('offsetY', String(imageSettings.offsetY))

    const { data } = await api.post('/api/user/profile/image?_method=PUT', payload)
    updateUser(data.user)
    setProfileImage(null)
    setImageInputKey((current) => current + 1)
  }

  const uploadProfileImage = async (event) => {
    event.preventDefault()
    if (imageSubmitting || profileSubmitting) return
    if (!profileImage && !user?.profileImage) {
      setStatus({ type: 'error', message: 'Please choose an image to upload.' })
      return
    }
    setImageSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      await persistProfileImage()
      setStatus({ type: 'success', message: 'Profile image updated successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setImageSubmitting(false)
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setStatus({ type: 'error', message: 'New password and confirmation do not match.' })
      return
    }

    try {
      await api.put('/api/user/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      setStatus({ type: 'success', message: 'Password changed successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Member'
  const isAdmin = user?.role === 'admin'

  return (
    <div className={`page-stack profile-workspace-page${isAdmin ? ' admin-profile-page' : ''}`}>
      <header className="profile-page-heading">
        <span className="eyebrow">{isAdmin ? 'Admin Workspace' : 'Client Workspace'} &nbsp;›&nbsp; Profile</span>
        <div className="profile-heading-row">
          <div><h1>{isAdmin ? 'Admin Profile' : 'Profile'}</h1><p>Manage your account details, update your profile image, and keep your account secure.</p></div>
          <aside><span><Icon name="shield" /></span><div><strong>Your Data is Secure</strong><small>We keep your information safe and confidential.</small></div><Icon name="verified" /></aside>
        </div>
      </header>

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}
      {user?.needsProfileCompletion ? <p className="form-message success">Please add your phone number below to complete your Google account setup.</p> : null}

      <section className={isAdmin ? 'admin-profile-summary-grid' : undefined}>
      <section className="profile-summary-banner">
        <div className="profile-summary-avatar">
          <UserAvatar
            alt={`${user?.name || 'User'} profile image`}
            className="profile-avatar-lg"
            imageUrl={previewUrl}
            settings={imageSettings}
            user={previewUrl ? { ...user, profileImage: '' } : user}
          />
          <button
            aria-label="Choose a profile photo"
            className="profile-avatar-camera-button"
            onClick={() => profileImageInputRef.current?.click()}
            disabled={imageSubmitting || profileSubmitting}
            type="button"
          >
            <Icon name="camera" />
          </button>
        </div>
        <div className="profile-summary-copy">
          <div><h2>{user?.name || 'User'}</h2><span>{isAdmin ? 'Administrator Account' : 'Client Account'}</span></div>
          <p>Manage your profile information and keep it up to date.</p>
          <div className="profile-contact-chips">
            {user?.email ? <span><Icon name="mail" />{user.email}</span> : null}
            {user?.phone ? <span><Icon name="phone" />{user.phone}</span> : null}
          </div>
        </div>
        <div className="profile-member-since"><span><Icon name="calendar" /></span><div><small>Member Since</small><strong>{memberSince}</strong><p>Your journey with us</p></div></div>
      </section>
      {isAdmin ? <><article className="admin-profile-stat-card services"><i><Icon name="fileCheck" /></i><strong>{adminStats.services}</strong><span>Total Services</span><small>Across all services</small></article><article className="admin-profile-stat-card appointments"><i><Icon name="calendar" /></i><strong>{adminStats.appointments}</strong><span>Total Appointments</span><small>Client bookings</small></article></> : null}
      </section>

      <section className="profile-main-grid">
        <article className="profile-section-card profile-photo-card">
          <header><span><Icon name="camera" /></span><div><h3>Profile Photo</h3><p>Upload and manage your profile photo.</p></div></header>
          <div className="profile-avatar-panel">
            <UserAvatar
              alt={`${user?.name || 'User'} profile image`}
              className="profile-avatar-editor"
              imageUrl={previewUrl}
              settings={imageSettings}
              user={previewUrl ? { ...user, profileImage: '' } : user}
            />
          </div>
          <form className="profile-image-form" onSubmit={uploadProfileImage}>
            <label className="profile-file-picker">
              <Icon name="advisor" />
              <strong>Upload Profile Photo</strong>
              <small>JPG, PNG (Max 5MB)</small>
              <span>Choose File</span>
              <input
                accept="image/jpeg,image/png"
                disabled={imageSubmitting || profileSubmitting}
                key={imageInputKey}
                name="profileImage"
                onChange={handleImageChange}
                ref={profileImageInputRef}
                type="file"
              />
            </label>
            <div className="profile-image-editor">
              <strong>Adjust Photo</strong>
              <div className="range-control">
                <div className="range-control-head">
                  <strong>Zoom</strong>
                  <span>{imageSettings.zoom.toFixed(2)}x</span>
                </div>
                <input
                  max="2.5"
                  min="1"
                  name="zoom"
                  onChange={handleImageSettingChange}
                  step="0.05"
                  type="range"
                  value={imageSettings.zoom}
                />
              </div>

              <div className="range-control">
                <div className="range-control-head">
                  <strong>Horizontal</strong>
                  <span>{imageSettings.offsetX}%</span>
                </div>
                <input
                  max="35"
                  min="-35"
                  name="offsetX"
                  onChange={handleImageSettingChange}
                  step="1"
                  type="range"
                  value={imageSettings.offsetX}
                />
              </div>

              <div className="range-control">
                <div className="range-control-head">
                  <strong>Vertical</strong>
                  <span>{imageSettings.offsetY}%</span>
                </div>
                <input
                  max="35"
                  min="-35"
                  name="offsetY"
                  onChange={handleImageSettingChange}
                  step="1"
                  type="range"
                  value={imageSettings.offsetY}
                />
              </div>
            </div>
            <div className="profile-image-actions">
              <button className="button button-ghost" onClick={resetImageSettings} type="button">
                <Icon name="refresh" /> Reset
              </button>
              <button className="button button-secondary" disabled={imageSubmitting || profileSubmitting} type="submit">
                <Icon name="fileCheck" /> {imageSubmitting ? 'Saving...' : 'Save Photo'}
              </button>
            </div>
          </form>
        </article>

        <form className="profile-section-card profile-details-form" onSubmit={saveProfile}>
          <header><span><Icon name="advisor" /></span><div><h3>Personal Details</h3><p>Update your account information.</p></div></header>
          <label>
            Full Name
            <span><Icon name="advisor" /><input name="name" onChange={handleProfileChange} required type="text" value={profileForm.name} /></span>
          </label>
          <label>
            Email Address
            <span><Icon name="mail" /><input name="email" onChange={handleProfileChange} required type="email" value={profileForm.email} /></span>
          </label>
          <label>
            Phone Number
            <span><Icon name="phone" /><input name="phone" onChange={handleProfileChange} required type="tel" value={profileForm.phone} /></span>
          </label>
          <label>
            Company Name
            <span><Icon name="building" /><input name="companyName" onChange={handleProfileChange} placeholder="Enter your company name" type="text" value={profileForm.companyName} /></span>
          </label>
          <button className="profile-primary-button" disabled={profileSubmitting || imageSubmitting} type="submit"><Icon name="fileCheck" />{profileSubmitting ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </section>

      <section className={isAdmin ? 'admin-profile-security-grid' : undefined}>
      <form className="profile-section-card profile-password-card" onSubmit={changePassword}>
        <header><span><Icon name="lock" /></span><div><h3>Change Password</h3><p>For your account security, use a strong password.</p></div></header>
        <div className="profile-password-fields">
          <label>Current Password<span><Icon name="lock" /><input
            name="currentPassword"
            onChange={handlePasswordChange}
            required
            type="password"
            value={passwordForm.currentPassword}
            placeholder="Enter current password"
          /></span></label>
          <label>New Password<span><Icon name="lock" /><input
            minLength="6"
            name="newPassword"
            onChange={handlePasswordChange}
            required
            type="password"
            value={passwordForm.newPassword}
            placeholder="Enter new password"
          /></span></label>
          <label>Confirm New Password<span><Icon name="lock" /><input
            minLength="6" name="confirmNewPassword" onChange={handlePasswordChange} required type="password"
            value={passwordForm.confirmNewPassword} placeholder="Confirm new password"
          /></span></label>
        </div>
        <div className="profile-password-footer"><p><Icon name="shield" />Password must be at least 6 characters long.</p><button className="profile-primary-button" type="submit"><Icon name="key" />Update Password</button></div>
      </form>

      <article className="profile-section-card profile-security-card">
        {isAdmin ? <div className="admin-two-factor-row"><span><Icon name="lock" /></span><section><strong>Two-Factor Authentication</strong><small>Add an extra layer of security to your account.</small></section><button aria-label="Two-factor authentication is not configured" className="admin-profile-toggle" disabled type="button"><i /></button></div> : null}
        <div className="profile-logout-row">
          <span><Icon name="logout" /></span>
          <section>
            <strong>Sign out of your account</strong>
            <small>You can sign in again at any time.</small>
          </section>
          <button className="profile-logout-button" onClick={handleLogout} type="button">Logout</button>
        </div>
      </article>
      </section>
      {isAdmin ? <aside className="admin-profile-tip"><i>💡</i><div><strong>Tip</strong><span>Keep your profile information up to date to ensure smooth communication and better account security.</span></div></aside> : null}
    </div>
  )
}

export default Profile
