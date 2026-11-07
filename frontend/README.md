# Malapote Ricemill dashboard

The Next.js frontend provides staff sign-in, customer registration, and a role-aware operations dashboard. Farm, mill, sales, and office modules are connected to the PHP API.

## Run locally

Start the LavaLust API from the repository root in one terminal. It runs on port `3000`:

```powershell
php lava serve
```

Then start the Next.js frontend in a second terminal. It runs on port `3001` to avoid conflicting with the backend:

```powershell
cd frontend
npm run dev
```

The Next.js route handler proxies requests through the same origin, so the browser does not need cross-origin access to PHP. Locally, API requests are forwarded to `http://127.0.0.1:3000`.

The PHP API must have `JWT_SECRET` and `REFRESH_TOKEN_KEY` configured. Public registration creates a customer account; only administrator accounts can enter the dashboard. Create or promote administrator accounts through the server-side account provisioning process.

## Separate shop and admin domains

The root landing page is selected by hostname, so the two domains open different portals without a shared chooser:

- `shop.yourdomain.com` opens the customer welcome page at `/`. Customers use Login or Register there; after signing in or registering, they arrive at `/shop/home`, the product catalog. Customer login and registration are at `/shop/login` and `/shop/register`.
- `admin.yourdomain.com` opens a separate staff landing page at `/`, with a button to the staff sign-in at `/login`. Successful staff sign-in leads to `/dashboard`.

In your hosting provider, point both subdomains to the frontend deployment. Set the hostname environment variables (hostnames only, no protocol or path) and backend URLs before building/deploying:

```text
SHOP_DOMAIN=shop.yourdomain.com
ADMIN_DOMAIN=admin.yourdomain.com
NEXT_PUBLIC_SHOP_LOGIN_URL=https://shop.yourdomain.com/shop/login
NEXT_PUBLIC_SHOP_REGISTER_URL=https://shop.yourdomain.com/shop/register
BACKEND_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_BACKEND_ORIGIN=https://api.yourdomain.com
```

`BACKEND_API_URL` is used by the server-side API proxy, while `NEXT_PUBLIC_BACKEND_ORIGIN` is used for product image URLs rendered in the browser. For separate frontend deployments instead of one deployment with two custom domains, set `PORTAL=shop` on the shop deployment and `PORTAL=admin` on the admin deployment. Replace the example hosts with your actual domains and redeploy after setting environment variables. On local development, the root page defaults to the customer landing page; the admin landing page is available at `/admin`, and staff sign-in is available at `/login`.

The customer portal does not link to staff sign-in, and the staff portal does not link to customer sign-in. These separate pages are for clarity, not access control: keep authorization checks enabled on the API and dashboard routes, and use HTTPS and strong credentials in production.

## Dashboard modules

Each module has its own page under `src/app/dashboard/` and a dedicated component under `src/components/dashboard/modules/`. Each `page.js` imports and renders that component; shared navigation, API access, tables, and forms live in separate shared component files.
