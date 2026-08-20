<script>
	import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { DatePicker, Portal, parseDate } from '@skeletonlabs/skeleton-svelte';

	let {
		startDate = $bindable(''),
		endDate = $bindable(''),
		startLabel = 'Início',
		endLabel = 'Fim'
	} = $props();

	const value = $derived.by(() => {
		try {
			return [startDate, endDate].filter(Boolean).map((date) => parseDate(date));
		} catch {
			return [];
		}
	});

	function handleValueChange(details) {
		startDate = details.value[0]?.toString() ?? '';
		endDate = details.value[1]?.toString() ?? '';
	}
</script>

<DatePicker
	{value}
	selectionMode="range"
	locale="pt-BR"
	closeOnSelect
	onValueChange={handleValueChange}
>
	<DatePicker.Label class="sr-only">Período da proposta</DatePicker.Label>
	<DatePicker.Context>
		{#snippet children(datePicker)}
			<DatePicker.Control class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div>
						<span class="mb-1 block text-xs font-semibold uppercase tracking-wider text-surface-700-300">
							{startLabel}
						</span>
						<div class="input-group grid-cols-[minmax(0,1fr)_auto]">
							<DatePicker.Input
								index={0}
								placeholder="dd/mm/aaaa"
								aria-label={startLabel}
								class="ig-input min-w-0 py-3 text-sm"
							/>
							<button
								type="button"
								onclick={() => datePicker().setOpen(true)}
								class="ig-btn preset-tonal px-3 text-surface-700-300"
								aria-label="Abrir calendário para a data inicial"
							>
								<CalendarDays class="size-4" />
							</button>
						</div>
					</div>
					<div>
						<span class="mb-1 block text-xs font-semibold uppercase tracking-wider text-surface-700-300">
							{endLabel}
						</span>
						<div class="input-group grid-cols-[minmax(0,1fr)_auto]">
							<DatePicker.Input
								index={1}
								placeholder="dd/mm/aaaa"
								aria-label={endLabel}
								class="ig-input min-w-0 py-3 text-sm"
							/>
							<button
								type="button"
								onclick={() => datePicker().setOpen(true)}
								class="ig-btn preset-tonal px-3 text-surface-700-300"
								aria-label="Abrir calendário para a data final"
							>
								<CalendarDays class="size-4" />
							</button>
						</div>
					</div>
			</DatePicker.Control>
		{/snippet}
	</DatePicker.Context>

	<Portal>
		<DatePicker.Positioner class="z-[120]">
			<DatePicker.Content class="w-[min(22rem,calc(100vw-2rem))] rounded-container border border-surface-200-800 bg-surface-50-950 p-3 outline-none">
				<DatePicker.View view="day">
					<DatePicker.Context>
						{#snippet children(datePicker)}
							<DatePicker.ViewControl class="mb-3 flex items-center justify-between">
								<DatePicker.PrevTrigger class="rounded-full p-2 text-surface-700-300 hover:preset-tonal" aria-label="Mês anterior">
									<ChevronLeft class="size-4" />
								</DatePicker.PrevTrigger>
								<DatePicker.RangeText class="text-sm font-semibold text-surface-950-50" />
								<DatePicker.NextTrigger class="rounded-full p-2 text-surface-700-300 hover:preset-tonal" aria-label="Próximo mês">
									<ChevronRight class="size-4" />
								</DatePicker.NextTrigger>
							</DatePicker.ViewControl>
							<DatePicker.Table class="w-full table-fixed border-collapse">
								<DatePicker.TableHead>
									<DatePicker.TableRow>
										{#each datePicker().weekDays as weekDay, id (id)}
											<DatePicker.TableHeader class="pb-2 text-center text-xs font-medium text-surface-700-300">
												{weekDay.narrow}
											</DatePicker.TableHeader>
										{/each}
									</DatePicker.TableRow>
								</DatePicker.TableHead>
								<DatePicker.TableBody>
									{#each datePicker().weeks as week, id (id)}
										<DatePicker.TableRow>
											{#each week as day, dayId (dayId)}
												<DatePicker.TableCell value={day} class="p-0.5">
													<DatePicker.TableCellTrigger
														class="flex size-9 w-full items-center justify-center rounded-container text-sm text-surface-700-300 hover:preset-tonal data-[selected]:preset-filled-primary-500 data-[in-range]:preset-tonal-primary data-[outside-range]:opacity-40"
													>
														{day.day}
													</DatePicker.TableCellTrigger>
												</DatePicker.TableCell>
											{/each}
										</DatePicker.TableRow>
									{/each}
								</DatePicker.TableBody>
							</DatePicker.Table>
						{/snippet}
					</DatePicker.Context>
				</DatePicker.View>
			</DatePicker.Content>
		</DatePicker.Positioner>
	</Portal>
</DatePicker>
