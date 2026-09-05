import { serviceCapabilities } from '@/lib/service-config';
export function GET() {
  return Response.json(serviceCapabilities(process.env), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
