export function getInitials(fullName: string): string {
  if (!fullName) {
    return "NA"; // "Not Available" atau inisial default lainnya
  }

  const nameParts = fullName.split(" ");
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }

  // Ambil huruf pertama dari dua kata pertama dan ubah menjadi huruf besar
  const firstInitial = nameParts[0].charAt(0).toUpperCase();
  const secondInitial = nameParts[1]?.charAt(0).toUpperCase() || ""; // Pastikan ada kata kedua

  return `${firstInitial}${secondInitial}`;
}
