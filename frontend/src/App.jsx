import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import PublicLayout from './components/common/PublicLayout.jsx'
import MobileBottomNav from './components/common/MobileBottomNav.jsx'
import ScrollFadeOutUp from './components/common/ScrollFadeOutUp.jsx'
import RouteSkeleton from './components/common/RouteSkeleton.jsx'
import ProtectedRoute from './components/dashboard/ProtectedRoute.jsx'
import DashboardLayout from './components/dashboard/DashboardLayout.jsx'
const Home = lazy(() => import('./pages/public/Home.jsx'))
const About = lazy(() => import('./pages/public/About.jsx'))
const PublicServices = lazy(() => import('./pages/public/Services.jsx'))
const MarketingWebApps = lazy(() => import('./pages/public/MarketingWebApps.jsx'))
const Blog = lazy(() => import('./pages/public/Blog.jsx'))
const BlogPost = lazy(() => import('./pages/public/BlogPost.jsx'))
const Contact = lazy(() => import('./pages/public/Contact.jsx'))
const Login = lazy(() => import('./pages/public/Login.jsx'))
const Register = lazy(() => import('./pages/public/Register.jsx'))
const NotFound = lazy(() => import('./pages/public/NotFound.jsx'))
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard.jsx'))
const UploadDocuments = lazy(() => import('./pages/dashboard/UploadDocuments.jsx'))
const MyDocuments = lazy(() => import('./pages/dashboard/Documents.jsx'))
const Appointments = lazy(() => import('./pages/dashboard/Appointments.jsx'))
const DashboardServices = lazy(() => import('./pages/dashboard/Services.jsx'))
const Payments = lazy(() => import('./pages/dashboard/Payments.jsx'))
const Messages = lazy(() => import('./pages/dashboard/Notifications.jsx'))
const Profile = lazy(() => import('./pages/dashboard/Profile.jsx'))
const PreparedDocuments = lazy(() => import('./pages/dashboard/PreparedDocuments.jsx'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const AdminDocuments = lazy(() => import('./pages/admin/Documents.jsx'))
const AdminMessages = lazy(() => import('./pages/admin/Messages.jsx'))
const AdminServices = lazy(() => import('./pages/admin/Services.jsx'))
const AdminAppointments = lazy(() => import('./pages/admin/Appointments.jsx'))
const AdminPayments = lazy(() => import('./pages/admin/Payments.jsx'))
const AdminPreparedDocuments = lazy(() => import('./pages/admin/PreparedDocuments.jsx'))
const AdminClientWorkspace = lazy(() => import('./pages/admin/ClientWorkspace.jsx'))
const AdminContactMessages = lazy(() => import('./pages/admin/ContactMessages.jsx'))
const AdminBlogs = lazy(() => import('./pages/admin/Blogs.jsx'))
const PrivacyPolicy = lazy(() => import('./pages/public/PrivacyPolicy.jsx'))
const RefundPolicy = lazy(() => import('./pages/public/RefundPolicy.jsx'))
const TermsAndConditions = lazy(() => import('./pages/public/TermsAndConditions.jsx'))
const ContentManager = lazy(() => import('./pages/admin/ContentManager.jsx'))
const InfluencerBookingDetails = lazy(() => import('./pages/admin/InfluencerBookingDetails.jsx'))
const WebsiteSettings = lazy(() => import('./pages/admin/WebsiteSettings.jsx'))
const PublicService = lazy(() => import('./pages/public/PublicService.jsx'))
const ComingSoon = lazy(() => import('./pages/public/ComingSoon.jsx'))
const PublicServicesManager = lazy(() => import('./pages/admin/PublicServicesManager.jsx'))
const ServiceTreeManager = lazy(() => import('./pages/admin/ServiceTreeManager.jsx'))
const DynamicServiceRequest = lazy(() => import('./pages/dashboard/DynamicServiceRequest.jsx'))
const DashboardContact = lazy(() => import('./pages/dashboard/Contact.jsx'))

function PersistentMobileNavigation() {
  const { pathname } = useLocation()
  return <MobileBottomNav dashboard={pathname.startsWith('/dashboard')} />
}

function App() {
  return (
    <BrowserRouter>
      <PersistentMobileNavigation />
      <ScrollFadeOutUp />
      <Suspense fallback={<RouteSkeleton />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="services" element={<PublicServices />} />
          <Route path="services/:slug" element={<PublicService />} />
          <Route path="coming-soon/:service" element={<ComingSoon />} />
          <Route path="marketing" element={<MarketingWebApps type="marketing" />} />
          <Route path="influencers" element={<MarketingWebApps type="influencers" />} />
          <Route path="web-apps" element={<MarketingWebApps type="web-apps" />} />
          <Route path="marketing-web-apps" element={<Navigate replace to="/marketing" />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="refund-policy" element={<RefundPolicy />} />
          <Route path="terms" element={<TermsAndConditions />} />
        </Route>

        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <DashboardLayout role="user" />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="documents" element={<Navigate replace to="/dashboard/my-documents" />} />
          <Route path="upload-documents" element={<UploadDocuments />} />
          <Route path="my-documents" element={<MyDocuments />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="services" element={<DashboardServices />} />
          <Route path="service-request" element={<DynamicServiceRequest />} />
          <Route path="payments" element={<Payments />} />
          <Route path="notifications" element={<Navigate replace to="/dashboard/messages" />} />
          <Route path="messages" element={<Messages />} />
          <Route path="prepared-documents" element={<PreparedDocuments />} />
          <Route path="profile" element={<Profile />} />
          <Route path="contact" element={<DashboardContact />} />
        </Route>

        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout role="admin" />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<Navigate replace to="/admin" />} />
          <Route path="clients/:userId" element={<AdminClientWorkspace section="overview" />} />
          <Route path="clients/:userId/services" element={<AdminClientWorkspace section="services" />} />
          <Route path="clients/:userId/services/:serviceKey" element={<AdminClientWorkspace section="service-detail" />} />
          <Route path="clients/:userId/appointments" element={<AdminClientWorkspace section="appointments" />} />
          <Route path="clients/:userId/payments" element={<AdminClientWorkspace section="payments" />} />
          <Route path="clients/:userId/profile" element={<AdminClientWorkspace section="profile" />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="inquiries" element={<AdminContactMessages />} />
          <Route path="documents" element={<Navigate replace to="/admin/folders" />} />
          <Route path="folders" element={<AdminDocuments />} />
          <Route path="folders/:userId" element={<AdminDocuments />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="services/influencers/bookings/:influencerId" element={<InfluencerBookingDetails />} />
          <Route path="services/influencers/bookings/:influencerId/:bookingId" element={<InfluencerBookingDetails />} />
          <Route path="services/:mainService" element={<ServiceTreeManager />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="blogs" element={<AdminBlogs />} />
          <Route path="prepared-documents" element={<AdminPreparedDocuments />} />
          <Route path="categories" element={<ContentManager resource="categories" />} />
          <Route path="public-services" element={<PublicServicesManager />} />
          <Route path="influencers" element={<Navigate replace to="/admin/services/influencers" />} />
          <Route path="testimonials" element={<ContentManager resource="testimonials" />} />
          <Route path="portfolio" element={<ContentManager resource="portfolio" />} />
          <Route path="faqs" element={<Navigate replace to="/admin/settings/faqs" />} />
          <Route path="homepage-content" element={<ContentManager resource="homepage" />} />
          <Route path="settings" element={<WebsiteSettings />} />
          <Route path="settings/faqs" element={<WebsiteSettings />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="home" element={<Navigate replace to="/" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
