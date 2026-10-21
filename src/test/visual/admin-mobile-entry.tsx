import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Fixture } from './AdminMobileFixture';
createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/admin']}>
    <Fixture />
  </MemoryRouter>
);
