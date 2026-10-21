import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { BookingHomePage } from '../../features/booking/pages/BookingHomePage';
import { NotFoundPage } from '../../features/notFound/pages/NotFoundPage';
import { RouteFailure } from '../../shared/components/RouteFailure';

export const routesConfig: RouteObject[] = [
  {
    path: '/',
    errorElement: <RouteFailure />,
    element: <RootLayout />,
    children: [
      // Reserva mínima de la raíz; la landing se desarrollará en otro alcance.
      {
        index: true,
        element: (
          <div className="site-pending">
            <span>HUOMO</span>
            <p>Sitio en preparación.</p>
          </div>
        ),
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
