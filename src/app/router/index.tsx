import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { BookingHomePage } from '../../features/booking/pages/BookingHomePage';
import { NotFoundPage } from '../../features/notFound/pages/NotFoundPage';
import { RouteFailure } from '../../shared/components/RouteFailure';

import { WelcomeAccess } from '../../features/auth/components/WelcomeAccess';

export const routesConfig: RouteObject[] = [
  {
    path: '/',
    errorElement: <RouteFailure />,
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <WelcomeAccess />,
      },
      {
        path: 'reservar',
        element: <PublicLayout />,
        children: [{ index: true, element: <BookingHomePage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/cliente',
    errorElement: <RouteFailure />,
    lazy: async () => ({ Component: (await import('../layouts/ClientLayout')).ClientLayout }),
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('../../features/client/pages/ClientHomePage')).ClientHomePage,
        }),
      },
      {
        path: 'reservar',
        lazy: async () => ({
          Component: (await import('../../features/client/pages/ClientBookingWizard'))
            .ClientBookingWizard,
        }),
      },
      {
        path: 'turnos',
        lazy: async () => ({
          Component: (await import('../../features/client/pages/ClientAppointmentsPage'))
            .ClientAppointmentsPage,
        }),
      },
      {
        path: 'sucursales',
        lazy: async () => ({
          Component: (await import('../../features/client/pages/ClientBranchesPage'))
            .ClientBranchesPage,
        }),
      },
      {
        path: 'perfil',
        lazy: async () => ({
          Component: (await import('../../features/client/pages/ClientProfilePage'))
            .ClientProfilePage,
        }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin',
    errorElement: <RouteFailure />,
    lazy: async () => ({ Component: (await import('../layouts/AdminLayout')).AdminLayout }),
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('../../features/admin/pages/AdminHomePage')).AdminHomePage,
        }),
      },
      {
        path: 'servicios',
        lazy: async () => ({
          Component: (await import('../../features/catalog/pages/CatalogPage')).CatalogPage,
        }),
      },
      {
        path: 'sucursales',
        lazy: async () => ({
          Component: (await import('../../features/branches/pages/BranchesPage')).BranchesPage,
        }),
      },
      {
        path: 'personal',
        lazy: async () => ({
          Component: (await import('../../features/staff/pages/StaffPage')).StaffPage,
        }),
      },
      {
        path: 'caja',
        lazy: async () => ({ Component: (await import('../../features/cash/CashPage')).CashPage }),
      },
      {
        path: 'turnos',
        lazy: async () => ({
          Component: (await import('../../features/admin/pages/AdminAppointmentsPage'))
            .AdminAppointmentsPage,
        }),
      },
      {
        path: 'personal/:employeeId',
        lazy: async () => ({
          Component: (await import('../../features/employees/pages/EmployeePage')).EmployeePage,
        }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/recepcion',
    errorElement: <RouteFailure />,
    lazy: async () => ({ Component: (await import('../layouts/ReceptionLayout')).ReceptionLayout }),
  },
  {
    path: '/sucursal/:branchId',
    errorElement: <RouteFailure />,
    lazy: async () => ({ Component: (await import('../layouts/AdminLayout')).AdminLayout }),
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('../../features/branches/finance/BranchDetailPage'))
            .BranchDetailPage,
        }),
      },
    ],
  },
  {
    path: '/barbero',
    errorElement: <RouteFailure />,
    lazy: async () => ({ Component: (await import('../layouts/BarberLayout')).BarberLayout }),
  },
];
export const router = createBrowserRouter(routesConfig);
