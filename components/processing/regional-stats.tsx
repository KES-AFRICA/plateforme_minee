"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n/context";
import { mockTaskStatsByRegion, mockTaskStatsByCity, mockTaskStatsByZone, mockTaskStatsByExploitation } from "@/lib/api/mock-data";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function RegionalStats() {
  const { t, language } = useI18n();

  const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="regions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="regions">Par Région</TabsTrigger>
          <TabsTrigger value="cities">Par Ville</TabsTrigger>
          <TabsTrigger value="zones">Par Zone</TabsTrigger>
          <TabsTrigger value="exploitations">Par Exploitation</TabsTrigger>
        </TabsList>

        {/* Stats by Region */}
        <TabsContent value="regions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques par Région Électrique</CardTitle>
              <CardDescription>Distribution des tâches par région ENEO</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockTaskStatsByRegion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region.code" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--border)",
                      }}
                      formatter={(value) => value}
                    />
                    <Legend />
                    <Bar dataKey="completed" fill="#10b981" name="Complétées" />
                    <Bar dataKey="pending" fill="#ef4444" name="En attente" />
                    <Bar dataKey="inProgress" fill="#f59e0b" name="En cours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-2">Région</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">Complétées</th>
                      <th className="text-right p-2">En attente</th>
                      <th className="text-right p-2">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTaskStatsByRegion.map((stat) => (
                      <tr key={stat.region.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{stat.region.name}</div>
                            <div className="text-xs text-muted-foreground">{stat.region.city}</div>
                          </div>
                        </td>
                        <td className="text-right p-2 font-medium">{stat.totalTasks}</td>
                        <td className="text-right p-2 text-green-600 font-medium">{stat.completed}</td>
                        <td className="text-right p-2 text-red-600 font-medium">{stat.pending}</td>
                        <td className="text-right p-2">
                          <div className="flex items-center justify-end gap-2">
                            <div className="text-sm font-medium">{stat.completionRate}%</div>
                            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-600"
                                style={{ width: `${stat.completionRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats by City */}
        <TabsContent value="cities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques par Ville</CardTitle>
              <CardDescription>Vue consolidée des tâches par ville</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mockTaskStatsByCity}
                        dataKey="totalTasks"
                        nameKey="city"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label
                      >
                        {mockTaskStatsByCity.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* List */}
                <div className="space-y-3">
                  {mockTaskStatsByCity.map((city) => (
                    <div key={city.city} className="border rounded-lg p-3">
                      <div className="font-medium mb-2">{city.city}</div>
                      <div className="text-sm space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-medium">{city.totalTasks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">En attente:</span>
                          <span className="font-medium text-red-600">{city.pending}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Taux:</span>
                          <span className="font-medium text-green-600">{city.completionRate}%</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {city.regions.length} région(s) électrique(s)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats by Zone */}
        <TabsContent value="zones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques par Zone</CardTitle>
              <CardDescription>Distribution des tâches par zone géographique</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockTaskStatsByZone.map((zone) => {
                  const rate = Math.round((zone.completed / zone.totalTasks) * 100);
                  return (
                    <div key={zone.zone} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{zone.zone}</span>
                        <span className="text-sm font-medium">{rate}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {zone.completed}/{zone.totalTasks}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats by Exploitation */}
        <TabsContent value="exploitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques par Exploitation</CardTitle>
              <CardDescription>Performance par point d'exploitation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-2">Exploitation</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">Complétées</th>
                      <th className="text-right p-2">Temps Moyen</th>
                      <th className="text-right p-2">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTaskStatsByExploitation.map((exp) => {
                      const rate = Math.round((exp.completed / exp.totalTasks) * 100);
                      return (
                        <tr key={exp.exploitationId} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{exp.exploitationName}</td>
                          <td className="text-right p-2">{exp.totalTasks}</td>
                          <td className="text-right p-2 text-green-600 font-medium">{exp.completed}</td>
                          <td className="text-right p-2">{exp.avgProcessingTime}j</td>
                          <td className="text-right p-2">
                            <span className="font-medium">{rate}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}