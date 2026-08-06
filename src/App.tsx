import { Navigate, Route, Routes } from "react-router-dom"

import { Toaster } from "@/components/Toaster"
import { AppLayout } from "@/components/layout/AppLayout"
import { OrgManagementRoute } from "@/components/OrgManagementRoute"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { DashboardPage } from "@/pages/DashboardPage"
import { LoginPage } from "@/pages/LoginPage"
import { EndClientFormPage } from "@/pages/end-clients/EndClientFormPage"
import { EndClientsPage } from "@/pages/end-clients/EndClientsPage"
import { ReimbursementFormPage } from "@/pages/reimbursements/ReimbursementFormPage"
import { ReimbursementsPage } from "@/pages/reimbursements/ReimbursementsPage"
import { ProfilePage } from "@/pages/ProfilePage"
import { EmployeeDetailPage } from "@/pages/employees/EmployeeDetailPage"
import { EmployeeFormPage } from "@/pages/employees/EmployeeFormPage"
import { EmployeesPage } from "@/pages/employees/EmployeesPage"
import { DepartmentFormPage } from "@/pages/departments/DepartmentFormPage"
import { DepartmentsPage } from "@/pages/departments/DepartmentsPage"
import { LeaveCalendarPage } from "@/pages/leave/LeaveCalendarPage"
import { LeaveRequestsPage } from "@/pages/leave/LeaveRequestsPage"
import { OrganizationDetailPage } from "@/pages/organizations/OrganizationDetailPage"
import { OrganizationFormPage } from "@/pages/organizations/OrganizationFormPage"
import { OrganizationsPage } from "@/pages/organizations/OrganizationsPage"

function App() {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />

            <Route path="dashboard" element={<DashboardPage />} />

            <Route path="profile" element={<ProfilePage />} />

            <Route path="employees">
              <Route index element={<EmployeesPage />} />
              <Route path="new" element={<EmployeeFormPage />} />
              <Route path=":id" element={<EmployeeDetailPage />} />
              <Route path=":id/edit" element={<EmployeeFormPage />} />
            </Route>

            <Route path="departments">
              <Route index element={<DepartmentsPage />} />
              <Route path="new" element={<DepartmentFormPage />} />
              <Route path=":id/edit" element={<DepartmentFormPage />} />
            </Route>

            <Route path="end-clients">
              <Route index element={<EndClientsPage />} />
              <Route path="new" element={<EndClientFormPage />} />
              <Route path=":id/edit" element={<EndClientFormPage />} />
            </Route>

            <Route path="leave">
              <Route index element={<LeaveRequestsPage />} />
              <Route path="calendar" element={<LeaveCalendarPage />} />
            </Route>

            <Route path="reimbursements">
              <Route index element={<ReimbursementsPage />} />
              <Route path="new" element={<ReimbursementFormPage />} />
            </Route>

            <Route path="organizations" element={<OrgManagementRoute />}>
              <Route index element={<OrganizationsPage />} />
              <Route path="new" element={<OrganizationFormPage />} />
              <Route path=":id" element={<OrganizationDetailPage />} />
              <Route path=":id/edit" element={<OrganizationFormPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
