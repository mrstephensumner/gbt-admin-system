import { Hono } from 'hono'
import type { Env } from './env'
import { errorEnvelope } from './middleware/errors'
import { withIdentity } from './middleware/identity'
import { meta } from './routes/meta'
import { talentRoutes } from './routes/talent'
import { photoRoutes } from './routes/photos'
import { topicRoutes } from './routes/topics'
import { brandRoutes } from './routes/brands'

type Variables = { operator: string }

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.onError(errorEnvelope)
app.use('/api/*', withIdentity)

app.route('/api', meta)
app.route('/api', talentRoutes)
app.route('/api', photoRoutes)
app.route('/api', topicRoutes)
app.route('/api', brandRoutes)

app.notFound((c) =>
  c.req.path.startsWith('/api')
    ? c.json({ error: { code: 'not_found', message: 'No such resource' } }, 404)
    : c.notFound(),
)

export default app
