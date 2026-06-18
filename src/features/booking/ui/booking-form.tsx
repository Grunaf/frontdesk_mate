'use client';

import { useState } from 'react';
import { useTranslations } from '@/shared/i18n';
import { Calendar as CalendarIcon, Users, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { HOSTEL_CONFIG } from '@/shared/config';
import {
  Button,
  Calendar,
  Icon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { BookingField } from './booking-field';

export function BookingForm() {
  const t = useTranslations('components.hero');
  const [guests, setGuests] = useState('1');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchUrl = new URL(HOSTEL_CONFIG.bookingUrl);

    if (dateRange?.from)
      searchUrl.searchParams.append('checkIn', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to)
      searchUrl.searchParams.append('checkOut', format(dateRange.to, 'yyyy-MM-dd'));
    searchUrl.searchParams.append('guests', guests);

    window.open(searchUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  return (
    <form
      onSubmit={handleSearch}
      className="mt-12 w-full rounded-2xl bg-card p-2 shadow-2xl shadow-foreground/20 md:p-3 lg:flex lg:items-stretch lg:gap-2"
    >
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:flex-1 lg:gap-1">
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <BookingField
              icon={<Icon icon={CalendarIcon} size={20} />}
              label={`${t('checkIn')} — ${t('checkOut')}`}
              onClick={() => setIsCalendarOpen(true)}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsCalendarOpen(true);
              }}
              className="sm:col-span-2"
              value={
                <span
                  className={cn(
                    'w-full truncate text-base font-bold',
                    dateRange?.from ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {dateRange?.from
                    ? dateRange.to
                      ? `${format(dateRange.from, 'dd.MM.yyyy')} — ${format(dateRange.to, 'dd.MM.yyyy')}`
                      : format(dateRange.from, 'dd.MM.yyyy')
                    : t('selectDates')}
                </span>
              }
            />
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <BookingField
          icon={<Icon icon={Users} size={20} />}
          label={t('guests')}
          value={
            <span className="text-base font-bold text-foreground">
              {guests} {guests === '1' ? t('guestSingle') : t('guestPlural')}
            </span>
          }
        >
          <Select value={guests} onValueChange={setGuests}>
            <SelectTrigger
              className="absolute inset-0 z-10 h-full w-full border-0 opacity-0 shadow-none focus-visible:ring-0 [&_svg]:hidden"
              aria-label={t('guests')}
            />
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <SelectItem key={num} value={String(num)}>
                  {num} {num === 1 ? t('guestSingle') : t('guestPlural')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Icon
            icon={ChevronDown}
            size={16}
            className="pointer-events-none absolute right-4 z-0 text-muted-foreground"
          />
        </BookingField>
      </div>

      <Button type="submit" size="lg" className="mt-2 w-full shrink-0 sm:mt-0 lg:w-auto lg:px-8">
        {t('bookButton')}
      </Button>
    </form>
  );
}
