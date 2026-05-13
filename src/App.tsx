import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import WaterDropRounded from '@mui/icons-material/WaterDropRounded';
import AirRounded from '@mui/icons-material/AirRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import BoltRounded from '@mui/icons-material/BoltRounded';
import WbSunnyRounded from '@mui/icons-material/WbSunnyRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line, BarChart, Bar, Cell } from 'recharts';
import { fetchDashboardPayload } from './lib/openMeteo';
import { fetchWeatherGuidance } from './lib/weatherGuidance';
import { buildHomeAlerts, formatWeatherLabel, getAqiLabel } from './lib/risk';
import type { AreaRisk, DashboardPayload } from './types';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: DashboardPayload };

type GuidanceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success';
      summary: string;
      suggestions: Array<{ title: string; detail: string }>;
      model: string;
    }
  | { status: 'error'; message: string };

const metricTone = (score: number) => {
  if (score >= 80) {
    return '#ff6f61';
  }
  if (score >= 62) {
    return '#ff9b54';
  }
  if (score >= 45) {
    return '#ffc857';
  }
  if (score >= 28) {
    return '#9ad26f';
  }
  return '#59e390';
};

const cardShell = {
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
};

const sectionTitle = (eyebrow: string, title: string, detail?: string) => (
  <Stack spacing={0.7} sx={{ mb: 2.2 }}>
    <Typography
      variant="overline"
      sx={{ letterSpacing: '0.16em', color: 'primary.main', fontWeight: 700 }}
    >
      {eyebrow}
    </Typography>
    <Typography variant="h5">{title}</Typography>
    {detail ? (
      <Typography variant="body2" color="text.secondary">
        {detail}
      </Typography>
    ) : null}
  </Stack>
);

const formatShortTime = (input: string) =>
  new Intl.DateTimeFormat('en-LK', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(input));

const formatShortDate = (input: string) =>
  new Intl.DateTimeFormat('en-LK', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(input));

const formatClock = (input: string) =>
  new Intl.DateTimeFormat('en-LK', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(input));

const StatTile = ({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) => (
  <Card sx={cardShell}>
    <CardContent>
      <Stack spacing={1.3}>
        <Box
          sx={{
            width: 44,
            height: 44,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 3,
            backgroundColor: 'rgba(123,242,227,0.14)',
            color: 'primary.main',
          }}
        >
          {icon}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4">{value}</Typography>
        <Typography variant="body2" color="text.secondary">
          {detail}
        </Typography>
      </Stack>
    </CardContent>
  </Card>
);

const App = () => {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [guidance, setGuidance] = useState<GuidanceState>({ status: 'idle' });

  const loadDashboard = async (silent = false) => {
    if (!silent) {
      setState({ status: 'loading' });
    } else {
      setRefreshing(true);
    }

    try {
      const data = await fetchDashboardPayload();
      setState({ status: 'ready', data });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load weather data.';
      setState({ status: 'error', message });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard();

    const intervalId = window.setInterval(() => {
      void loadDashboard(true);
    }, 1000 * 60 * 15);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (state.status !== 'ready') {
      return;
    }

    let cancelled = false;

    const { home, areas, generatedAt } = state.data;
    const topArea = areas[0];

    const loadGuidance = async () => {
      setGuidance({ status: 'loading' });

      try {
        const result = await fetchWeatherGuidance(home, topArea);

        if (cancelled) {
          return;
        }

        setGuidance({
          status: 'success',
          summary: result.summary,
          suggestions: result.suggestions,
          model: result.model,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Unable to load AI weather guidance.';
        setGuidance({ status: 'error', message });
      }
    };

    void loadGuidance();

    return () => {
      cancelled = true;
    };
  }, [state]);

  if (state.status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          px: 3,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress color="primary" />
          <Typography variant="h6">Loading Sri Lanka weather intelligence</Typography>
        </Stack>
      </Box>
    );
  }

  if (state.status === 'error') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          px: 3,
        }}
      >
        <Card sx={{ maxWidth: 540, width: '100%' }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Dashboard failed to load</Typography>
              <Alert severity="error">{state.message}</Alert>
              <Button variant="contained" onClick={() => void loadDashboard()}>
                Retry
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const { data } = state;
  const { home, areas, generatedAt } = data;
  const topArea = areas[0];
  const homeAlerts = buildHomeAlerts(home, topArea);
  const timeline = home.hourly.slice(0, 24).map((entry) => ({
    ...entry,
    label: formatShortTime(entry.time),
  }));
  const rainTimeline = home.hourly.slice(0, 24).map((entry) => ({
    ...entry,
    label: formatShortTime(entry.time),
  }));

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Card sx={{ ...cardShell, p: { xs: 0.5, md: 1 } }}>
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Grid container spacing={3} alignItems="stretch">
              <Grid size={{ xs: 12, lg: 7 }}>
                <Stack spacing={2.4}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Stack spacing={1.2}>
                      {/* <Chip
                        label="Open-Meteo Powered"
                        color="secondary"
                        sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
                      /> */}
                      <Typography variant="h2" sx={{ fontSize: { xs: '2.3rem', md: '3.5rem' } }}>
                        Sri Lanka Weather Risk Dashboard
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680 }}>
                        Focused on {home.location.name} and a monitored set of flood-, rain-, and
                        exposure-sensitive areas across Sri Lanka. This dashboard combines forecast,
                        air quality, and river-discharge signals into one local command view.
                      </Typography>
                    </Stack>
                    <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={1}>
                      <Button
                        variant="contained"
                        startIcon={<RefreshRounded />}
                        onClick={() => void loadDashboard(true)}
                      >
                        Refresh
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        Updated {formatClock(generatedAt)} local time
                      </Typography>
                    </Stack>
                  </Stack>

                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.2}
                    divider={<Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', md: 'block' } }} />}
                  >
                    <Stack spacing={0.6} sx={{ minWidth: 0 }}>
                      <Typography variant="overline" color="primary.main">
                        Home Focus
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PlaceRounded fontSize="small" color="primary" />
                        <Typography variant="h5">{home.location.name}</Typography>
                      </Stack>
                      <Typography color="text.secondary">
                        {home.location.latitude.toFixed(4)}, {home.location.longitude.toFixed(4)} • {home.timezone}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.6}>
                      <Typography variant="overline" color="primary.main">
                        Current Conditions
                      </Typography>
                      <Typography variant="h5">
                        {home.current.temperature.toFixed(1)}°C, {formatWeatherLabel(home.current.weatherCode)}
                      </Typography>
                      <Typography color="text.secondary">
                        Feels like {home.current.apparentTemperature.toFixed(1)}°C with humidity at {home.current.humidity.toFixed(0)}%.
                      </Typography>
                    </Stack>
                    <Stack spacing={0.6}>
                      <Typography variant="overline" color="primary.main">
                        National Hotspot
                      </Typography>
                      <Typography variant="h5">
                        {topArea.location.name} • {topArea.level}
                      </Typography>
                      <Typography color="text.secondary">
                        Risk score {topArea.score.toFixed(0)} / 100 across monitored locations.
                      </Typography>
                    </Stack>
                  </Stack>

                  {refreshing ? <LinearProgress color="secondary" /> : null}
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, lg: 5 }}>
                <Card
                  sx={{
                    ...cardShell,
                    background:
                      'linear-gradient(145deg, rgba(242,183,94,0.18), rgba(123,242,227,0.06))',
                  }}
                >
                  <CardContent>
                    {sectionTitle(
                      'Alert Board',
                      'Home-area alerts',
                      'Threshold-based alerts generated from the latest Open-Meteo forecast, air quality, and flood signals.',
                    )}
                    <Stack spacing={1.2}>
                      {homeAlerts.map((alert) => (
                        <Alert key={`${alert.title}-${alert.detail}`} severity={alert.tone}>
                          <Typography variant="subtitle2">{alert.title}</Typography>
                          <Typography variant="body2">{alert.detail}</Typography>
                        </Alert>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={2.2}>
          <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
            <StatTile
              icon={<WaterDropRounded />}
              label="24h rain outlook"
              value={`${timeline.reduce((total, point) => total + point.rain, 0).toFixed(0)} mm`}
              detail={`Peak rain chance ${Math.max(...timeline.map((point) => point.precipitationProbability)).toFixed(0)}%`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
            <StatTile
              icon={<AirRounded />}
              label="Air quality"
              value={`${home.currentAir.usAqi.toFixed(0)} AQI`}
              detail={`${getAqiLabel(home.currentAir.usAqi)} • PM2.5 ${home.currentAir.pm25.toFixed(1)} μg/m³`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
            <StatTile
              icon={<BoltRounded />}
              label="Wind exposure"
              value={`${Math.max(...timeline.map((point) => point.windGust)).toFixed(0)} km/h`}
              detail={`Current gust ${home.current.windGust.toFixed(0)} km/h`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
            <StatTile
              icon={<WbSunnyRounded />}
              label="UV exposure"
              value={`${home.daily[0]?.maxUv.toFixed(1) ?? '0.0'}`}
              detail={`Sunrise ${formatClock(home.daily[0]?.sunrise ?? generatedAt)} • Sunset ${formatClock(home.daily[0]?.sunset ?? generatedAt)}`}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2.2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={cardShell}>
              <CardContent>
                {sectionTitle(
                  'Home Trend',
                  'Next 24 hours',
                  'Temperature and rain trend for the Latonia Gardens focus area.',
                )}
                <Box sx={{ width: '100%', height: 360 }}>
                  <ResponsiveContainer>
                    <AreaChart data={timeline}>
                      <defs>
                        <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7bf2e3" stopOpacity={0.55} />
                          <stop offset="100%" stopColor="#7bf2e3" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="label" stroke="rgba(238,247,255,0.62)" tickLine={false} />
                      <YAxis
                        yAxisId="temp"
                        stroke="rgba(238,247,255,0.62)"
                        tickLine={false}
                        width={40}
                      />
                      <YAxis
                        yAxisId="rain"
                        orientation="right"
                        stroke="rgba(238,247,255,0.62)"
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 16,
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(7, 19, 29, 0.92)',
                        }}
                      />
                      <Area
                        yAxisId="temp"
                        type="monotone"
                        dataKey="temperature"
                        stroke="#7bf2e3"
                        fill="url(#tempFill)"
                        strokeWidth={3}
                      />
                      <Line
                        yAxisId="rain"
                        type="monotone"
                        dataKey="rain"
                        stroke="#f2b75e"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={cardShell}>
              <CardContent>
                {sectionTitle(
                  '7-Day Outlook',
                  'Daily forecast rail',
                  'Condensed daily planning view for the main area.',
                )}
                <Stack spacing={1.2}>
                  {home.daily.map((day) => (
                    <Box
                      key={day.time}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid rgba(255,255,255,0.08)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        spacing={2}
                        alignItems="center"
                      >
                        <Stack>
                          <Typography variant="subtitle1">{formatShortDate(day.time)}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatWeatherLabel(day.weatherCode)}
                          </Typography>
                        </Stack>
                        <Stack alignItems="flex-end">
                          <Typography variant="subtitle1">
                            {day.maxTemp.toFixed(0)}° / {day.minTemp.toFixed(0)}°
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {day.precipitationSum.toFixed(0)} mm • UV {day.maxUv.toFixed(1)}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={2.2}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card sx={cardShell}>
              <CardContent>
                {sectionTitle(
                  'Risk Ranking',
                  'Monitored Sri Lanka hotspots',
                  'Areas are ranked by rainfall, flood factor, gusts, AQI, and UV exposure.',
                )}
                <Stack spacing={1.2}>
                  {areas.slice(0, 8).map((area, index) => (
                    <Box
                      key={area.location.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background:
                          index === 0
                            ? 'linear-gradient(135deg, rgba(255,111,97,0.14), rgba(242,183,94,0.08))'
                            : 'rgba(255,255,255,0.025)',
                      }}
                    >
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Stack>
                            <Typography variant="subtitle1">{area.location.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {area.location.district}
                            </Typography>
                          </Stack>
                          <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
                            <Chip
                              label={`${area.level} • ${area.score.toFixed(0)}`}
                              sx={{
                                backgroundColor: `${metricTone(area.score)}22`,
                                color: metricTone(area.score),
                                fontWeight: 700,
                              }}
                            />
                          </Stack>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {area.summary}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {area.alerts.map((alert) => (
                            <Chip
                              key={`${area.location.id}-${alert}`}
                              label={alert}
                              size="small"
                              icon={<WarningAmberRounded />}
                              sx={{
                                backgroundColor: 'rgba(255,255,255,0.06)',
                                color: 'text.primary',
                              }}
                            />
                          ))}
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 7 }}>
            <Card sx={cardShell}>
              <CardContent>
                {sectionTitle(
                  'National Comparison',
                  'Risk score by monitored area',
                  'Use this to quickly scan which parts of Sri Lanka need attention first.',
                )}
                <Box sx={{ width: '100%', height: 420 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={areas.slice(0, 10).map((area) => ({
                        name: area.location.name,
                        score: Number(area.score.toFixed(0)),
                        rain: Number(area.rainfallMm.toFixed(0)),
                      }))}
                      layout="vertical"
                      margin={{ top: 10, right: 8, left: 12, bottom: 0 }}
                    >
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                      <XAxis type="number" stroke="rgba(238,247,255,0.62)" tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="rgba(238,247,255,0.62)"
                        tickLine={false}
                        width={110}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 16,
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(7, 19, 29, 0.92)',
                        }}
                      />
                      <Bar dataKey="score" radius={[0, 10, 10, 0]}>
                        {areas.slice(0, 10).map((area) => (
                          <Cell key={area.location.id} fill={metricTone(area.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={2.2}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card sx={cardShell}>
              <CardContent>
                {sectionTitle(
                  'AI Guidance',
                  'Next 24-hour home advice',
                  'OpenAI reviews your home forecast, air quality, and short-range weather trend to generate three practical suggestions.',
                )}
                <Stack spacing={1.3}>
                  {guidance.status === 'loading' ? <LinearProgress color="secondary" /> : null}
                  <Typography variant="body2" color="text.secondary">
                    Guidance is generated for {home.location.name} using the next 24 hours of forecast data.
                  </Typography>

                  {guidance.status === 'success' ? (
                    <>
                      <Alert severity="info">
                        <Typography variant="body2">{guidance.summary}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                          Model: {guidance.model}
                        </Typography>
                      </Alert>
                      {guidance.suggestions.map((item) => (
                        <Alert key={item.title} severity="success">
                          <Typography variant="subtitle2">{item.title}</Typography>
                          <Typography variant="body2">{item.detail}</Typography>
                        </Alert>
                      ))}
                    </>
                  ) : null}

                  {guidance.status === 'error' ? (
                    <Alert severity="error">{guidance.message}</Alert>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Card sx={cardShell}>
              <CardContent>
                {sectionTitle(
                  'Rain Window',
                  'Probability and rainfall',
                  'Short-range rain behavior over the next 24 hours.',
                )}
                <Box sx={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <LineChart data={rainTimeline}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="label" stroke="rgba(238,247,255,0.62)" tickLine={false} />
                      <YAxis
                        yAxisId="chance"
                        stroke="rgba(238,247,255,0.62)"
                        tickLine={false}
                        width={40}
                      />
                      <YAxis
                        yAxisId="rain"
                        orientation="right"
                        stroke="rgba(238,247,255,0.62)"
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 16,
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(7, 19, 29, 0.92)',
                        }}
                      />
                      <Line
                        yAxisId="chance"
                        type="monotone"
                        dataKey="precipitationProbability"
                        stroke="#7bf2e3"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line
                        yAxisId="rain"
                        type="monotone"
                        dataKey="rain"
                        stroke="#f2b75e"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Card sx={cardShell}>
              <CardContent>
                {sectionTitle(
                  'Exposure Snapshot',
                  'What matters right now',
                  'Quick operational values for visibility into the current home-area state.',
                )}
                <Grid container spacing={1.5}>
                  {[
                    {
                      label: 'Humidity',
                      value: `${home.current.humidity.toFixed(0)}%`,
                    },
                    {
                      label: 'Cloud cover',
                      value: `${home.current.cloudCover.toFixed(0)}%`,
                    },
                    {
                      label: 'Pressure',
                      value: `${home.current.pressure.toFixed(0)} hPa`,
                    },
                    {
                      label: 'Wind speed',
                      value: `${home.current.windSpeed.toFixed(0)} km/h`,
                    },
                    {
                      label: 'PM10',
                      value: `${home.currentAir.pm10.toFixed(1)} μg/m³`,
                    },
                    {
                      label: 'CO',
                      value: `${home.currentAir.carbonMonoxide.toFixed(0)} μg/m³`,
                    },
                  ].map((item) => (
                    <Grid key={item.label} size={{ xs: 6 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {item.label}
                        </Typography>
                        <Typography variant="h5" sx={{ mt: 0.8 }}>
                          {item.value}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
};

export default App;
