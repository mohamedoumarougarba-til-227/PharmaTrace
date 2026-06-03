import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { FAIcon } from '../constants/icons';

interface CustomDatePickerProps {
  visible: boolean;
  onClose: () => void;
  value: string; // Format "JJ/MM/AAAA"
  onChange: (date: string) => void;
  title?: string;
}

const WEEKDAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
const DAY_HEADERS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

export default function CustomDatePicker({
  visible,
  onClose,
  value,
  onChange,
  title = 'Choisir une date',
}: CustomDatePickerProps) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'calendar' | 'month' | 'year'>('calendar');

  // Initialisation à partir de la valeur de l'input
  useEffect(() => {
    if (visible) {
      const dateParts = value.split('/');
      if (dateParts.length === 3) {
        const d = parseInt(dateParts[0], 10);
        const m = parseInt(dateParts[1], 10) - 1; // 0-indexed en JS
        const y = parseInt(dateParts[2], 10);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
          setSelectedDay(d);
          setCurrentMonth(m);
          setCurrentYear(y);
          setViewMode('calendar');
          return;
        }
      }
      // Fallback sur aujourd'hui
      const today = new Date();
      setSelectedDay(today.getDate());
      setCurrentMonth(today.getMonth());
      setCurrentYear(today.getFullYear());
      setViewMode('calendar');
    }
  }, [visible, value]);

  // Obtenir le nombre de jours d'un mois
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Clamper le jour si on change de mois/année (ex: 31 Janvier -> Février => 28 Février)
  const clampDay = (day: number, month: number, year: number) => {
    const maxDays = getDaysInMonth(year, month);
    return Math.min(day, maxDays);
  };

  // Liste des années (de 2020 à 2040 pour couvrir expiration/fabrication)
  const yearsList: number[] = [];
  for (let y = 2020; y <= 2040; y++) {
    yearsList.push(y);
  }

  // Navigation mois
  const handlePrevMonth = () => {
    let nextMonth = currentMonth - 1;
    let nextYear = currentYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    }
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
    setSelectedDay(prev => clampDay(prev, nextMonth, nextYear));
  };

  const handleNextMonth = () => {
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
    setSelectedDay(prev => clampDay(prev, nextMonth, nextYear));
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(monthIndex);
    setSelectedDay(prev => clampDay(prev, monthIndex, currentYear));
    setViewMode('calendar');
  };

  const handleYearSelect = (year: number) => {
    setCurrentYear(year);
    setSelectedDay(prev => clampDay(prev, currentMonth, year));
    setViewMode('calendar');
  };

  const handleDaySelect = (day: number, isCurrentMonth: boolean, cellMonth: number, cellYear: number) => {
    if (!isCurrentMonth) {
      setCurrentMonth(cellMonth);
      setCurrentYear(cellYear);
    }
    setSelectedDay(day);
  };

  const handleConfirm = () => {
    const dayStr = String(selectedDay).padStart(2, '0');
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    onChange(`${dayStr}/${monthStr}/${currentYear}`);
    onClose();
  };

  // Génération de la grille des 42 cases (6 lignes x 7 colonnes)
  const getDaysGrid = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    
    // Premier jour du mois (0 = Dimanche, 1 = Lundi, etc.)
    let startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    // Ajuster pour Lundi = 0, Dimanche = 6
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const daysGrid = [];

    // Jours du mois précédent
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      daysGrid.push({
        day: daysInPrevMonth - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
      });
    }

    // Jours du mois en cours
    for (let i = 1; i <= daysInMonth; i++) {
      daysGrid.push({
        day: i,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
      });
    }

    // Jours du mois suivant
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const remainingCells = 42 - daysGrid.length;
    for (let i = 1; i <= remainingCells; i++) {
      daysGrid.push({
        day: i,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
      });
    }

    return daysGrid;
  };

  // Formater la date sélectionnée pour l'en-tête
  const getSelectedDateLabel = () => {
    try {
      const d = new Date(currentYear, currentMonth, selectedDay);
      const weekday = WEEKDAYS_FR[d.getDay()];
      const month = MONTHS_FR[currentMonth];
      return `${weekday.slice(0, 4)}. ${selectedDay} ${month}`;
    } catch {
      return `${selectedDay} ${MONTHS_FR[currentMonth]}`;
    }
  };

  const today = new Date();
  const isTodayCell = (day: number, month: number, year: number) => {
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-5">
        <View className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
          
          {/* En-tête bleu Navy Premium */}
          <View className="bg-navy p-5">
            <Text className="text-blue-light/70 text-[10px] font-bold uppercase tracking-wider mb-1">
              {title}
            </Text>
            <View className="flex-row justify-between items-baseline">
              <Text className="text-white text-2xl font-black">
                {getSelectedDateLabel()}
              </Text>
              <Text className="text-blue-light font-bold text-lg">
                {currentYear}
              </Text>
            </View>
          </View>

          {/* Corps du calendrier */}
          <View className="p-5 bg-white min-h-[330px] justify-center">
            
            {viewMode === 'calendar' && (
              <View>
                {/* Barre de navigation du mois/année */}
                <View className="flex-row justify-between items-center mb-4">
                  <TouchableOpacity
                    onPress={handlePrevMonth}
                    className="p-2 rounded-full bg-bg border border-blue-light/50 active:bg-blue-light/30"
                  >
                    <FAIcon name="chevron-left" size={12} color="#1A3A5C" family="FontAwesome6" />
                  </TouchableOpacity>

                  <View className="flex-row gap-1.5">
                    {/* Bouton Choix Mois */}
                    <TouchableOpacity
                      onPress={() => setViewMode('month')}
                      className="px-2.5 py-1 bg-bg border border-blue-light rounded-lg flex-row items-center gap-1 active:bg-blue-light/30"
                    >
                      <Text className="text-navy font-bold text-xs">{MONTHS_FR[currentMonth]}</Text>
                      <FAIcon name="caret-down" size={10} color="#1A3A5C" family="FontAwesome6" />
                    </TouchableOpacity>

                    {/* Bouton Choix Année */}
                    <TouchableOpacity
                      onPress={() => setViewMode('year')}
                      className="px-2.5 py-1 bg-bg border border-blue-light rounded-lg flex-row items-center gap-1 active:bg-blue-light/30"
                    >
                      <Text className="text-navy font-bold text-xs">{currentYear}</Text>
                      <FAIcon name="caret-down" size={10} color="#1A3A5C" family="FontAwesome6" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleNextMonth}
                    className="p-2 rounded-full bg-bg border border-blue-light/50 active:bg-blue-light/30"
                  >
                    <FAIcon name="chevron-right" size={12} color="#1A3A5C" family="FontAwesome6" />
                  </TouchableOpacity>
                </View>

                {/* En-tête des jours de la semaine */}
                <View className="flex-row justify-between mb-2">
                  {DAY_HEADERS.map((h, i) => (
                    <Text
                      key={i}
                      className={`w-9 text-center font-bold text-[10px] uppercase ${
                        i >= 5 ? 'text-pharma-orange' : 'text-muted'
                      }`}
                    >
                      {h}
                    </Text>
                  ))}
                </View>

                {/* Grille des jours */}
                <View className="flex-row flex-wrap justify-between">
                  {getDaysGrid().map((cell, index) => {
                    const isSelected =
                      cell.isCurrentMonth &&
                      cell.day === selectedDay &&
                      cell.month === currentMonth &&
                      cell.year === currentYear;
                    const isToday = isTodayCell(cell.day, cell.month, cell.year);

                    return (
                      <View key={index} className="w-[14.28%] aspect-square items-center justify-center p-0.5">
                        <TouchableOpacity
                          onPress={() => handleDaySelect(cell.day, cell.isCurrentMonth, cell.month, cell.year)}
                          className={`w-8 h-8 rounded-full items-center justify-center ${
                            isSelected
                              ? 'bg-blue'
                              : isToday
                              ? 'bg-blue/10 border border-blue/40'
                              : 'active:bg-blue-light/40'
                          }`}
                        >
                          <Text
                            className={`text-xs ${
                              isSelected
                                ? 'text-white font-extrabold'
                                : cell.isCurrentMonth
                                ? 'text-navy font-bold'
                                : 'text-muted/30 font-medium'
                            }`}
                          >
                            {cell.day}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Mode de sélection du Mois */}
            {viewMode === 'month' && (
              <View className="flex-1 justify-center">
                <Text className="text-navy font-extrabold text-sm mb-3 text-center">
                  Sélectionner un mois
                </Text>
                <View className="flex-row flex-wrap justify-between">
                  {MONTHS_FR.map((monthName, idx) => {
                    const isCurrent = idx === currentMonth;
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => handleMonthSelect(idx)}
                        className={`w-[30%] py-2.5 mb-2 rounded-xl items-center justify-center ${
                          isCurrent ? 'bg-blue' : 'bg-bg border border-blue-light/50 active:bg-blue-light/30'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isCurrent ? 'text-white' : 'text-navy'
                          }`}
                        >
                          {monthName.slice(0, 4)}.
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Mode de sélection de l'Année */}
            {viewMode === 'year' && (
              <View className="h-60 justify-center">
                <Text className="text-navy font-extrabold text-sm mb-2 text-center">
                  Sélectionner une année
                </Text>
                <ScrollView contentContainerStyle={styles.yearsScroll}>
                  <View className="flex-row flex-wrap justify-between p-1">
                    {yearsList.map(year => {
                      const isCurrent = year === currentYear;
                      return (
                        <TouchableOpacity
                          key={year}
                          onPress={() => handleYearSelect(year)}
                          className={`w-[30%] py-2.5 mb-2 rounded-xl items-center justify-center ${
                            isCurrent ? 'bg-blue' : 'bg-bg border border-blue-light/50 active:bg-blue-light/30'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              isCurrent ? 'text-white' : 'text-navy'
                            }`}
                          >
                            {year}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

          </View>

          {/* Boutons d'action en bas */}
          <View className="flex-row justify-end gap-3 pt-3 border-t border-bg px-5 pb-5 bg-white">
            <TouchableOpacity
              onPress={onClose}
              className="px-5 py-2.5 rounded-xl bg-bg border border-blue-light active:bg-blue-light/30"
            >
              <Text className="text-navy font-bold text-xs">Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              className="px-6 py-2.5 rounded-xl bg-navy active:opacity-95"
            >
              <Text className="text-white font-extrabold text-xs">Confirmer</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  yearsScroll: {
    paddingBottom: 10,
  },
});
