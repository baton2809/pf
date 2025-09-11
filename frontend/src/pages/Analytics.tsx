import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, LabelList } from 'recharts';
import { trainingApiService } from '../services/trainingApi';

interface AnalyticsData {
  totalSessions: number;
  averageScore: number;
  bestScore: number;
  monthlyGrowth: number;
  totalTime: number;
  todayTime: number;
  streakDays: number;
  completedRecommendations: number;
  dynamicsData: Array<{ date: string; value: number }>;
  averageMetrics: Array<{ name: string; current: number; previous: number }>;
}

export const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await trainingApiService.getAnalytics();
      setAnalytics(data);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      setError('Ошибка загрузки аналитики');
    } finally {
      setLoading(false);
    }
  };

  const getBestScore = () => {
    return analytics?.bestScore || 0;
  };

  const getMonthlyGrowth = () => {
    if (!analytics) return "0.0";
    const growth = analytics.monthlyGrowth;
    return growth >= 0 ? `+${growth.toFixed(1)}` : growth.toFixed(1);
  };

  const getCompletedRecommendations = () => {
    return analytics?.completedRecommendations || 0;
  };

  const getTodayPracticeTime = () => {
    if (!analytics) return "0м";
    return analytics.todayTime > 0 ? `${analytics.todayTime}м` : "0м";
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <p>Загрузка аналитики...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <p style={{ color: '#dc3545' }}>{error}</p>
        <button onClick={loadAnalytics} style={{
          padding: '8px 16px',
          backgroundColor: '#1a73e8',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '16px'
        }}>
          Повторить
        </button>
      </div>
    );
  }

  const dynamicsData = analytics?.dynamicsData || [];
  const averageData = analytics?.averageMetrics || [];

  return (
    <div>
      <h3 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>Ваш прогресс</h3>

      {/* графики */}
      <div style={{ 
        maxWidth: '100%', 
        margin: '0 auto'
      }}>
        <div className="analytics-grid">
          {/* левая колонка - динамика общей оценки */}
          <div>
            {/* статистические блоки левой колонки */}
            <div className="analytics-stats-grid">
              {/* всего сессий */}
              <div className="stat-card stat-card-compact accent-blue">
                <div className="stat-card-value">{analytics?.totalSessions || 0}</div>
                <div className="stat-card-label">Всего сессий</div>
              </div>

              {/* средний балл */}
              <div className="stat-card stat-card-compact accent-green">
                <div className="stat-card-value">{analytics?.averageScore?.toFixed(1) || '0.0'}</div>
                <div className="stat-card-label">Средний балл</div>
              </div>

              {/* лучший результат */}
              <div className="stat-card stat-card-compact accent-yellow">
                <div className="stat-card-value">{getBestScore().toFixed(1)}</div>
                <div className="stat-card-label">Лучший результат</div>
              </div>

              {/* рост за месяц */}
              <div className="stat-card stat-card-compact accent-teal">
                <div className="stat-card-value">{getMonthlyGrowth()}</div>
                <div className="stat-card-label">Рост за месяц</div>
              </div>
            </div>

            <div className="card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              minHeight: '400px'
            }}>
              <h3 style={{ marginBottom: '8px' }}>
                Динамика общей оценки
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                {dynamicsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dynamicsData}>
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#5f6368', fontFamily: 'Inter, sans-serif' }}
                      />
                      <YAxis 
                        domain={[1, 10]}
                        axisLine={false}
                        tickLine={false}
                        tick={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#1a73e8" 
                        strokeWidth={3}
                        dot={{ fill: '#1a73e8', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#1a73e8', strokeWidth: 2 }}
                      />
                      <LabelList 
                        dataKey="value" 
                        position="top"
                        style={{ 
                          fontSize: '14px', 
                          fill: '#202124', 
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: '600'
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#6c757d',
                    padding: '40px 20px'
                  }}>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>
                      Данные недоступны
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                      Динамика появится после нескольких тренировочных сессий
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* правая колонка - средние показатели */}
          <div>
            {/* статистические блоки правой колонки */}
            <div className="analytics-stats-grid">
              {/* время сегодня */}
              <div className="stat-card stat-card-compact accent-blue">
                <div className="stat-card-value">{getTodayPracticeTime()}</div>
                <div className="stat-card-label">Время сегодня</div>
              </div>

              {/* общее время */}
              <div className="stat-card stat-card-compact accent-orange">
                <div className="stat-card-value">{analytics?.totalTime || 0}м</div>
                <div className="stat-card-label">Общее время</div>
              </div>

              {/* дней подряд */}
              <div className="stat-card stat-card-compact accent-purple">
                <div className="stat-card-value">{analytics?.streakDays || 0}</div>
                <div className="stat-card-label">Дней подряд</div>
              </div>

              {/* рекомендации выполнены */}
              <div className="stat-card stat-card-compact accent-green">
                <div className="stat-card-value">{getCompletedRecommendations()}%</div>
                <div className="stat-card-label">Рекомендации выполнены</div>
              </div>
            </div>

            <div className="card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              minHeight: '400px'
            }}>
              <h3 style={{ marginBottom: '8px' }}>
                Средние показатели
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                {averageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={averageData} barCategoryGap="20%">
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#5f6368', fontFamily: 'Inter, sans-serif' }}
                      />
                      <YAxis 
                        domain={[1, 10]}
                        axisLine={false}
                        tickLine={false}
                        tick={false}
                      />
                      <Bar 
                        dataKey="previous" 
                        fill="#e5e7eb" 
                        radius={[4, 4, 0, 0]}
                        name="Предыдущий период"
                      />
                      <LabelList 
                        dataKey="previous" 
                        position="top"
                        style={{ 
                          fontSize: '14px', 
                          fill: '#202124', 
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: '500'
                        }}
                      />
                      <Bar 
                        dataKey="current" 
                        fill="#1a73e8" 
                        radius={[4, 4, 0, 0]}
                        name="Текущий период"
                      />
                      <LabelList 
                        dataKey="current" 
                        position="top"
                        style={{ 
                          fontSize: '14px', 
                          fill: '#202124', 
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: '600'
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#6c757d',
                    padding: '40px 20px'
                  }}>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>
                      Данные недоступны
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                      Средние показатели появятся после тренировочных сессий
                    </p>
                  </div>
                )}
              </div>
              
              {/* легенда */}
              {averageData.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  marginTop: '16px',
                  gap: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '2px',
                      marginRight: '8px'
                    }}></div>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#5f6368',
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      Первое использование
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: '#1a73e8',
                      borderRadius: '2px',
                      marginRight: '8px'
                    }}></div>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#5f6368',
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      Сегодня
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};