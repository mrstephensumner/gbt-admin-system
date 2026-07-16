import { Hono } from 'hono'
import type { Env } from './env'
import { errorEnvelope } from './middleware/errors'
import { withIdentity } from './middleware/identity'
import { withAuthorization, type AuthzVariables } from './middleware/authorize'
import { meta } from './routes/meta'
import { talentRoutes } from './routes/talent'
import { photoRoutes } from './routes/photos'
import { topicRoutes } from './routes/topics'
import { brandRoutes } from './routes/brands'
import { teamRoutes } from './routes/team'
import { importRoutes } from './routes/importing'
import { dashboardRoutes } from './routes/dashboard'

const app = new Hono<{ Bindings: Env; Variables: AuthzVariables }>()

app.onError(errorEnvelope)
app.use('/api/*', withIdentity)
app.use('/api/*', withAuthorization) // registry gate: every route, reads included (FR-003)

app.route('/api', meta)
app.route('/api', talentRoutes)
app.route('/api', photoRoutes)
app.route('/api', topicRoutes)
app.route('/api', brandRoutes)
app.route('/api', teamRoutes)
app.route('/api', importRoutes)
app.route('/api', dashboardRoutes)

app.notFound((c) =>
  c.req.path.startsWith('/api')
    ? c.json({ error: { code: 'not_found', message: 'No such resource' } }, 404)
    : c.notFound(),
)

export default app
