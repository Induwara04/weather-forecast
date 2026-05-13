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
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import WbSunnyRounded from '@mui/icons-material/WbSunnyRounded';
import CloudRounded from '@mui/icons-material/CloudRounded';
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

const formatDayName = (input: string) =>
  new Intl.DateTimeFormat('en-LK', {
    weekday: 'short',
  }).format(new Date(input));

const getDailyWeatherIcon = (weatherCode: number) => {
  if ([95, 96, 99].includes(weatherCode)) {
    return <BoltRounded sx={{ fontSize: 38, color: '#f2b75e' }} />;
  }

  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)
  ) {
    return <WaterDropRounded sx={{ fontSize: 38, color: '#68c7ff' }} />;
  }

  if ([0, 1].includes(weatherCode)) {
    return <WbSunnyRounded sx={{ fontSize: 38, color: '#ffd166' }} />;
  }

  return <CloudRounded sx={{ fontSize: 38, color: '#eef7ff' }} />;
};

const getHomeAlertGraphic = ({
  title,
  tone,
  rainMm,
  rainChance,
  hotspotName,
  hotspotScore,
}: {
  title: string;
  tone: 'error' | 'warning' | 'info' | 'success';
  rainMm: number;
  rainChance: number;
  hotspotName: string;
  hotspotScore: number;
}) => {
  if (title === 'Rain alert') {
    return {
      icon: <WaterDropRounded sx={{ fontSize: 28, color: '#68c7ff' }} />,
      accent: '#68c7ff',
      background: 'linear-gradient(135deg, rgba(104,199,255,0.22), rgba(104,199,255,0.08))',
      label: 'Today rain',
      value: `${rainMm.toFixed(0)} mm`,
      subvalue: `${rainChance.toFixed(0)}% chance`,
    };
  }

  if (title === 'National hotspot') {
    return {
      icon: <PlaceRounded sx={{ fontSize: 28, color: '#7bf2e3' }} />,
      accent: '#7bf2e3',
      background: 'linear-gradient(135deg, rgba(123,242,227,0.22), rgba(123,242,227,0.08))',
      label: 'Top area',
      value: hotspotName,
      subvalue: `${hotspotScore.toFixed(0)} / 100`,
    };
  }

  if (title === 'Wind alert') {
    return {
      icon: <AirRounded sx={{ fontSize: 28, color: '#ffc857' }} />,
      accent: '#ffc857',
      background: 'linear-gradient(135deg, rgba(255,200,87,0.22), rgba(255,200,87,0.08))',
      label: 'Wind risk',
      value: 'Gust watch',
      subvalue: 'Outdoor caution',
    };
  }

  if (title === 'Air quality alert') {
    return {
      icon: <CloudRounded sx={{ fontSize: 28, color: '#ff9b54' }} />,
      accent: '#ff9b54',
      background: 'linear-gradient(135deg, rgba(255,155,84,0.22), rgba(255,155,84,0.08))',
      label: 'Air quality',
      value: 'AQI watch',
      subvalue: 'Sensitive groups',
    };
  }

  if (title === 'UV alert') {
    return {
      icon: <WbSunnyRounded sx={{ fontSize: 28, color: '#ffd166' }} />,
      accent: '#ffd166',
      background: 'linear-gradient(135deg, rgba(255,209,102,0.22), rgba(255,209,102,0.08))',
      label: 'UV peak',
      value: 'Sun exposure',
      subvalue: 'Midday caution',
    };
  }

  if (tone === 'success') {
    return {
      icon: <CloudRounded sx={{ fontSize: 28, color: '#59e390' }} />,
      accent: '#59e390',
      background: 'linear-gradient(135deg, rgba(89,227,144,0.22), rgba(89,227,144,0.08))',
      label: 'Status',
      value: 'Calmer window',
      subvalue: 'No severe trigger',
    };
  }

  return {
    icon: <WarningAmberRounded sx={{ fontSize: 28, color: '#eef7ff' }} />,
    accent: '#eef7ff',
    background: 'linear-gradient(135deg, rgba(238,247,255,0.18), rgba(238,247,255,0.06))',
    label: 'Weather',
    value: 'Active signal',
    subvalue: 'Monitor closely',
  };
};

const getGuidanceSuggestionGraphic = (title: string, detail: string) => {
  const content = `${title} ${detail}`.toLowerCase();

  if (/(rain|shower|drizzle|wet|umbrella|storm)/.test(content)) {
    return {
      icon: <WaterDropRounded sx={{ fontSize: 24, color: '#68c7ff' }} />,
      accent: '#68c7ff',
      background: 'linear-gradient(135deg, rgba(104,199,255,0.18), rgba(104,199,255,0.06))',
      label: 'Rain Focus',
    };
  }

  if (/(wind|gust|breeze)/.test(content)) {
    return {
      icon: <AirRounded sx={{ fontSize: 24, color: '#ffc857' }} />,
      accent: '#ffc857',
      background: 'linear-gradient(135deg, rgba(255,200,87,0.18), rgba(255,200,87,0.06))',
      label: 'Wind Watch',
    };
  }

  if (/(uv|sun|heat|shade|hydration)/.test(content)) {
    return {
      icon: <WbSunnyRounded sx={{ fontSize: 24, color: '#ffd166' }} />,
      accent: '#ffd166',
      background: 'linear-gradient(135deg, rgba(255,209,102,0.18), rgba(255,209,102,0.06))',
      label: 'Exposure',
    };
  }

  if (/(air|aqi|pm2|pm10|breath|smoke)/.test(content)) {
    return {
      icon: <CloudRounded sx={{ fontSize: 24, color: '#ff9b54' }} />,
      accent: '#ff9b54',
      background: 'linear-gradient(135deg, rgba(255,155,84,0.18), rgba(255,155,84,0.06))',
      label: 'Air Quality',
    };
  }

  if (/(home|roof|indoors|route|travel|commute)/.test(content)) {
    return {
      icon: <PlaceRounded sx={{ fontSize: 24, color: '#7bf2e3' }} />,
      accent: '#7bf2e3',
      background: 'linear-gradient(135deg, rgba(123,242,227,0.18), rgba(123,242,227,0.06))',
      label: 'Planning',
    };
  }

  return {
    icon: <BoltRounded sx={{ fontSize: 24, color: '#eef7ff' }} />,
    accent: '#eef7ff',
    background: 'linear-gradient(135deg, rgba(238,247,255,0.14), rgba(238,247,255,0.04))',
    label: 'Action',
  };
};

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
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Stack spacing={0.8}>
        <Stack direction="row" spacing={0.9} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1,
              backgroundColor: 'rgba(123,242,227,0.14)',
              color: 'primary.main',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Stack>
        <Typography variant="h4" sx={{ lineHeight: 1.05 }}>
          {value}
        </Typography>
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
  const [showAllHotspots, setShowAllHotspots] = useState(false);

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
  const today = home.daily[0];
  const homeAlerts = buildHomeAlerts(home, topArea);
  const timeline = home.hourly.slice(0, 24).map((entry) => ({
    ...entry,
    label: formatShortTime(entry.time),
  }));
  const dailyOutlook = home.daily.slice(0, 7);
  const hotspotAreas = areas.slice(0, 8);
  const visibleHotspots = showAllHotspots ? hotspotAreas : hotspotAreas.slice(0, 3);
  const hasMoreHotspots = hotspotAreas.length > 3;
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
                      {homeAlerts.map((alert) => {
                        const graphic = getHomeAlertGraphic({
                          title: alert.title,
                          tone: alert.tone,
                          rainMm: today?.precipitationSum ?? 0,
                          rainChance: today?.precipitationProbabilityMax ?? 0,
                          hotspotName: topArea?.location.name ?? 'Unknown',
                          hotspotScore: topArea?.score ?? 0,
                        });

                        return (
                          <Box
                            key={`${alert.title}-${alert.detail}`}
                            sx={{
                              p: 1,
                              borderRadius: 0.5,
                              border: `1px solid ${graphic.accent}22`,
                              backgroundColor: 'rgba(8,20,30,0.55)',
                            }}
                          >
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              spacing={1.5}
                              justifyContent="space-between"
                              alignItems={{ xs: 'flex-start', sm: 'center' }}
                            >
                              <Stack direction="row" spacing={1.1} alignItems="flex-start">
                                <Box
                                  sx={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 0.5,
                                    display: 'grid',
                                    placeItems: 'center',
                                    background: graphic.background,
                                    border: `1px solid ${graphic.accent}33`,
                                    flexShrink: 0,
                                  }}
                                >
                                  {graphic.icon}
                                </Box>
                                <Stack spacing={0.25}>
                                  <Typography variant="subtitle2" sx={{ color: graphic.accent }}>
                                    {alert.title}
                                  </Typography>
                                  <Typography variant="body2">{alert.detail}</Typography>
                                </Stack>
                              </Stack>

                              <Box
                                sx={{
                                  minWidth: { xs: '100%', sm: 96 },
                                  px: 0.9,
                                  py: 0.7,
                                  borderRadius: 0.5,
                                  background: graphic.background,
                                  border: `1px solid ${graphic.accent}29`,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: 'block',
                                    color: graphic.accent,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.12em',
                                  }}
                                >
                                  {graphic.label}
                                </Typography>
                                <Typography variant="subtitle2" sx={{ mt: 0.35 }}>
                                  {graphic.value}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {graphic.subvalue}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        );
                      })}
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
          <Grid size={{ xs: 12 }}>
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

                <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)' }} />

                <Stack spacing={1.6}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={0.8}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <Box>
                      <Typography
                        variant="overline"
                        sx={{ letterSpacing: '0.16em', color: 'primary.main', fontWeight: 700 }}
                      >
                        7-Day Outlook
                      </Typography>
                      <Typography variant="h6">Daily forecast rail</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Swipe or scroll across the next 7 days.
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      overflowX: 'auto',
                      pb: 1,
                      '&::-webkit-scrollbar': {
                        height: 8,
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'rgba(255,255,255,0.14)',
                        borderRadius: 999,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        width: 'max-content',
                        minWidth: '100%',
                        justifyContent: 'center',
                        scrollSnapType: 'x proximity',
                      }}
                    >
                      {dailyOutlook.map((day, index) => (
                        <Box
                          key={day.time}
                          sx={{
                            minWidth: { xs: 104, sm: 118, md: 126 },
                            px: { xs: 2, sm: 2.25 },
                            py: { xs: 2, sm: 2.4 },
                            borderRadius: 1,
                            border: '1px solid rgba(255,255,255,0.08)',
                            background:
                              index === 0
                                ? 'linear-gradient(180deg, rgba(116,120,142,0.42), rgba(86,90,108,0.36))'
                                : 'rgba(255,255,255,0.03)',
                            scrollSnapAlign: 'start',
                            flexShrink: 0,
                          }}
                        >
                          <Stack spacing={1.2} alignItems="center">
                            <Stack spacing={0.15} alignItems="center">
                              <Typography variant="h5" sx={{ fontWeight: 500 }}>
                                {formatDayName(day.time)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatShortDate(day.time)}
                              </Typography>
                            </Stack>

                            <Box
                              sx={{
                                width: 52,
                                height: 52,
                                display: 'grid',
                                placeItems: 'center',
                              }}
                            >
                              {getDailyWeatherIcon(day.weatherCode)}
                            </Box>

                            <Stack spacing={0.35} alignItems="center">
                              <Typography
                                variant="h4"
                                sx={{ fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em' }}
                              >
                                {day.maxTemp.toFixed(0)}°
                              </Typography>
                              <Typography variant="h6" color="text.secondary" sx={{ lineHeight: 1 }}>
                                {day.minTemp.toFixed(0)}°
                              </Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={2.2}>
          <Grid size={{ xs: 12 }}>
            <Card sx={cardShell}>
              <CardContent>
                {sectionTitle(
                  'AI Guidance',
                  'Next 24-hour home advice',
                  'OpenAI reviews your home forecast, air quality, and short-range weather trend to generate practical suggestions.',
                )}
                <Stack spacing={2}>
                  <Box
                    sx={{
                      p: { xs: 1.2, md: 1.5 },
                      borderRadius: 1,
                      border: '1px solid rgba(123,242,227,0.12)',
                      background:
                        'radial-gradient(circle at top left, rgba(123,242,227,0.14), rgba(255,255,255,0.02) 58%)',
                    }}
                  >
                    <Stack
                      direction={{ xs: 'column', lg: 'row' }}
                      spacing={1.4}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', lg: 'center' }}
                    >
                      <Stack spacing={0.7}>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              display: 'grid',
                              placeItems: 'center',
                              borderRadius: 1,
                              backgroundColor: 'rgba(123,242,227,0.14)',
                              color: 'primary.main',
                              flexShrink: 0,
                            }}
                          >
                            <AutoAwesomeRounded fontSize="small" />
                          </Box>
                          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700 }}>
                            AI summary
                          </Typography>
                        </Stack>
                        <Typography variant="h6" sx={{ maxWidth: 900, lineHeight: 1.3 }}>
                          {guidance.status === 'success'
                            ? guidance.summary
                            : guidance.status === 'error'
                              ? 'Guidance is temporarily unavailable for the latest forecast window.'
                              : 'Generating a concise action brief from the latest 24-hour weather pattern.'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Guidance is generated for {home.location.name} using the next 24 hours of forecast data.
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={home.location.name} sx={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                        <Chip label="24h horizon" sx={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                      </Stack>
                    </Stack>
                  </Box>

                  {guidance.status === 'loading' ? <LinearProgress color="secondary" /> : null}

                  {guidance.status === 'success' ? (
                    <Grid container spacing={1.5}>
                      {guidance.suggestions.map((item) => {
                        const graphic = getGuidanceSuggestionGraphic(item.title, item.detail);

                        return (
                          <Grid key={item.title} size={{ xs: 12, md: 6, xl: 4 }}>
                            <Box
                              sx={{
                                height: '100%',
                                p: 1.6,
                                borderRadius: 1,
                                border: `1px solid ${graphic.accent}22`,
                                background: 'rgba(255,255,255,0.025)',
                              }}
                            >
                              <Stack spacing={1.1}>
                                <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                                  <Box
                                    sx={{
                                      width: 38,
                                      height: 38,
                                      display: 'grid',
                                      placeItems: 'center',
                                      borderRadius: 1,
                                      background: graphic.background,
                                      border: `1px solid ${graphic.accent}29`,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {graphic.icon}
                                  </Box>
                                  <Chip
                                    label={graphic.label}
                                    size="small"
                                    sx={{
                                      backgroundColor: `${graphic.accent}14`,
                                      color: graphic.accent,
                                      fontWeight: 700,
                                    }}
                                  />
                                </Stack>
                                <Typography variant="subtitle1">{item.title}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {item.detail}
                                </Typography>
                              </Stack>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : null}

                  {guidance.status === 'error' ? (
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid rgba(255,111,97,0.2)',
                        background: 'linear-gradient(135deg, rgba(255,111,97,0.14), rgba(255,111,97,0.05))',
                      }}
                    >
                      <Stack direction="row" spacing={1.2} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: 1,
                            backgroundColor: 'rgba(255,111,97,0.16)',
                            color: '#ff6f61',
                            flexShrink: 0,
                          }}
                        >
                          <WarningAmberRounded fontSize="small" />
                        </Box>
                        <Stack spacing={0.35}>
                          <Typography variant="subtitle2" sx={{ color: '#ffb2aa' }}>
                            Guidance service error
                          </Typography>
                          <Typography variant="body2">{guidance.message}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Check the AI weather service route and try refreshing the dashboard.
                          </Typography>
                        </Stack>
                      </Stack>
                    </Box>
                  ) : null}
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
                  {visibleHotspots.map((area, index) => (
                    <Box
                      key={area.location.id}
                      sx={{
                        p: 1.25,
                        borderRadius: 1,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background:
                          index === 0
                            ? 'linear-gradient(135deg, rgba(255,111,97,0.14), rgba(242,183,94,0.08))'
                            : 'rgba(255,255,255,0.025)',
                      }}
                    >
                      <Stack spacing={0.8}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          spacing={0.8}
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
                  {hasMoreHotspots ? (
                    <Button
                      variant="text"
                      onClick={() => setShowAllHotspots((current) => !current)}
                      sx={{ alignSelf: 'flex-start', px: 0, minWidth: 0 }}
                    >
                      {showAllHotspots ? 'See less' : `See more (${hotspotAreas.length - 3})`}
                    </Button>
                  ) : null}
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
