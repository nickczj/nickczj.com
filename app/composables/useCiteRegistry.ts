export const useCiteRegistry = () => {
  const route = useRoute()
  const order = useState<string[]>(`cite-order-${route.path}`, () => [])

  return {
    register(id: string) {
      if (!order.value.includes(id)) order.value.push(id)
      return order.value.indexOf(id) + 1
    },
    all: () => order.value,
  }
}
