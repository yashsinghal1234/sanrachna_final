import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'

import { useAuth } from '@/auth/AuthContext'
import { AppLayout } from '@/layouts/AppLayout'
import { MarketingLayout } from '@/layouts/MarketingLayout'
import { AppDashboardPage } from '@/pages/AppDashboardPage'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { PlanningStudioPage } from '@/pages/PlanningStudioPage'
import { DailyLogsPage } from '@/pages/DailyLogsPage'
import { ProjectInsightsPage } from '@/pages/ProjectInsightsPage'
import { RfiPage } from '@/pages/RfiPage'
import { RoleSelectionPage } from '@/pages/RoleSelectionPage'
import { SignupPage } from '@/pages/SignupPage'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { AICopilotPage } from '@/pages/AICopilotPage'
import { ContactsPage } from '@/pages/ContactsPage'
import { EmergencyPage } from '@/pages/EmergencyPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ProcurementPage } from '@/pages/ProcurementPage'
import { TimelinePage } from '@/pages/TimelinePage'
import { CostResourcesPage } from '@/pages/CostResourcesPage'
import { IssuesPage } from '@/pages/IssuesPage'
import { MyTasksPage } from '@/pages/MyTasksPage'
import { SubmitDailyLogPage } from '@/pages/SubmitDailyLogPage'
import { SettingsLayout } from '@/layouts/SettingsLayout'
import { ProfileSettingsPage } from '@/pages/settings/ProfileSettingsPage'
import { SecuritySettingsPage } from '@/pages/settings/SecuritySettingsPage'
import { NotificationSettingsPage } from '@/pages/settings/NotificationSettingsPage'
import { ProjectSettingsPage } from '@/pages/settings/ProjectSettingsPage'
import { TeamSettingsPage } from '@/pages/settings/TeamSettingsPage'
import { CreateProjectPage } from '@/pages/CreateProjectPage'
import { RequireRouteAccess } from '@/components/RequireRouteAccess'

function RequireAuth({ children }: { children: ReactElement }) {
  const { isAuthed } = useAuth()
  if (!isAuthed) return <Navigate to="/login" replace />
  return children
}

function RequireRole({ children }: { children: ReactElement }) {
  const { role } = useAuth()
  if (!role) return <Navigate to="/select-role" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/select-role"
          element={
            <RequireAuth>
              <RoleSelectionPage />
            </RequireAuth>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route
        path="/app"
        element={
          <RequireAuth>
            <RequireRole>
              <AppLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<RequireRouteAccess><AppDashboardPage /></RequireRouteAccess>} />

        <Route path="create-project" element={<RequireRouteAccess><CreateProjectPage /></RequireRouteAccess>} />
        <Route path="projects/new" element={<RequireRouteAccess><Navigate to="/app/create-project" replace /></RequireRouteAccess>} />

        <Route path="insights" element={<RequireRouteAccess><ProjectInsightsPage /></RequireRouteAccess>} />
        <Route path="timeline" element={<RequireRouteAccess><TimelinePage /></RequireRouteAccess>} />
        <Route path="procurement" element={<RequireRouteAccess><ProcurementPage /></RequireRouteAccess>} />
        <Route path="documents" element={<RequireRouteAccess><DocumentsPage /></RequireRouteAccess>} />

        <Route path="estimation" element={<RequireRouteAccess><PlanningStudioPage /></RequireRouteAccess>} />
        <Route path="chatbot" element={<RequireRouteAccess><AICopilotPage /></RequireRouteAccess>} />
        <Route path="logs" element={<RequireRouteAccess><DailyLogsPage /></RequireRouteAccess>} />
        <Route path="rfi" element={<RequireRouteAccess><RfiPage /></RequireRouteAccess>} />
        <Route path="issues" element={<RequireRouteAccess><IssuesPage /></RequireRouteAccess>} />
        <Route path="cost-resources" element={<RequireRouteAccess><CostResourcesPage /></RequireRouteAccess>} />

        <Route path="my-tasks" element={<RequireRouteAccess><MyTasksPage /></RequireRouteAccess>} />
        <Route path="logs/new" element={<RequireRouteAccess><SubmitDailyLogPage /></RequireRouteAccess>} />
        <Route path="issues/new" element={<RequireRouteAccess><IssuesPage /></RequireRouteAccess>} />
        <Route path="emergency" element={<RequireRouteAccess><EmergencyPage /></RequireRouteAccess>} />

        <Route path="contacts" element={<RequireRouteAccess><ContactsPage /></RequireRouteAccess>} />
        <Route path="notifications" element={<RequireRouteAccess><Navigate to="/app" replace /></RequireRouteAccess>} />

        <Route path="team" element={<Navigate to="/app/settings/team" replace />} />

        <Route path="settings" element={<RequireRouteAccess><SettingsLayout /></RequireRouteAccess>}>
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<ProfileSettingsPage />} />
          <Route path="password" element={<SecuritySettingsPage />} />
          <Route path="notifications" element={<NotificationSettingsPage />} />
          <Route path="project" element={<ProjectSettingsPage />} />
          <Route path="team" element={<TeamSettingsPage />} />
        </Route>
      </Route>

      <Route path="/create-project" element={<Navigate to="/app/create-project" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
