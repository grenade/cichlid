import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Container from 'react-bootstrap/Container';
import Image from 'react-bootstrap/Image';
//import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
//import NavDropdown from 'react-bootstrap/NavDropdown';
import ProbeDeflectStats from './ProbeDeflectStats';
import ProbeSourceStats from './ProbeSourceStats';

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProbeSourceStats />,
  },
  {
    path: "/deflections",
    element: <ProbeDeflectStats />,
  },
]);

function App() {
  return (
    <Container>
      <Navbar expand="lg" className="bg-body-tertiary">
        <Container>
          <Navbar.Brand href="#home">
            <Image src="cichlid-30.png" style={{marginRight: '0.5em'}} />
            cichlid stats
          </Navbar.Brand>
          {
            /*
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link href="#home">Home</Nav.Link>
              <Nav.Link href="#link">Link</Nav.Link>
              <NavDropdown title="Dropdown" id="basic-nav-dropdown">
                <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                <NavDropdown.Item href="#action/3.2">
                  Another action
                </NavDropdown.Item>
                <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item href="#action/3.4">
                  Separated link
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
            */
          }
        </Container>
      </Navbar>
      <RouterProvider router={router} />
    </Container>
  );
}

export default App;
