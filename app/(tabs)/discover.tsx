import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Avatar, FormField, KiniBottomSheet, KiniButton, KiniCard, KiniSwitch, PrimaryButton, kiniColors } from "@/components/kini-ui";
import { ScreenContainer } from "@/components/screen-container";
import { type HideDuration, type NearbyGender, type NearbyProfile, type NearbyStatus, type NearbyUser, nearbyApi } from "@/features/nearby/nearby-api";

const genders: Record<NearbyGender, string> = { male: "Nam", female: "Nữ", other: "Khác", prefer_not: "Không nêu" };
const statuses: Record<NearbyStatus, string> = { single: "Độc thân", dating: "Đang hẹn hò", married: "Đã kết hôn", complicated: "Phức tạp", prefer_not: "Không nêu" };
const radii = [5, 10, 20, 30, 50, 100] as const;
const year = new Date().getFullYear();
const initial = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "K";
const label = <T extends string>(value: T | null | undefined, labels: Record<T, string>, fallback: string) => value ? labels[value] : fallback;

type Picker = "gender" | "status" | "radius" | "province" | "age" | "sort" | "hide" | "detail" | null;

export default function DiscoverScreen() {
  const [active, setActive] = useState<"explore" | "me">("explore");
  const [profile, setProfile] = useState<NearbyProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [permissionSheet, setPermissionSheet] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [people, setPeople] = useState<NearbyUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<NearbyUser | null>(null);
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState<number>(50);
  const [filterGender, setFilterGender] = useState<NearbyGender | undefined>();
  const [filterStatus, setFilterStatus] = useState<NearbyStatus | undefined>();
  const [filterProvince, setFilterProvince] = useState("");
  const [ageFrom, setAgeFrom] = useState("18");
  const [ageTo, setAgeTo] = useState("100");
  const [sort, setSort] = useState<"near" | "far">("near");
  const [gender, setGender] = useState<NearbyGender | null>(null);
  const [status, setStatus] = useState<NearbyStatus | null>(null);
  const [province, setProvince] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [bio, setBio] = useState("");
  const [job, setJob] = useState("");

  const setFromProfile = useCallback((value: NearbyProfile) => {
    setProfile(value); setGender(value.gender); setStatus(value.status); setProvince(value.province ?? "");
    setBirthYear(value.birthYear ? String(value.birthYear) : ""); setBio(value.bio ?? ""); setJob(value.job ?? "");
  }, []);
  const load = useCallback(async () => {
    try { const value = await nearbyApi.me(); setFromProfile(value); if (!value.setupComplete) setPermissionSheet(true); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Không thể tải Tìm Quanh Đây."); }
    finally { setProfileLoading(false); }
  }, [setFromProfile]);
  useEffect(() => { void load(); }, [load]);

  const getLocation = useCallback(async () => {
    const grant = await Location.requestForegroundPermissionsAsync();
    if (grant.status !== "granted") throw new Error("Bạn đã từ chối vị trí. Hãy bật quyền Vị trí khi muốn tìm theo khoảng cách.");
    if (!(await Location.hasServicesEnabledAsync())) throw new Error("Hãy bật Dịch vụ vị trí trên điện thoại rồi thử lại.");
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await nearbyApi.updateLocation(location.coords.latitude, location.coords.longitude);
    setProfile((previous) => previous ? { ...previous, lat: location.coords.latitude, lng: location.coords.longitude } : previous);
    return location.coords;
  }, []);

  const allow = async () => {
    setPermissionSheet(false); setWorking(true);
    try { await getLocation(); setActive("me"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Không thể lấy vị trí KINI."); setActive("me"); }
    finally { setWorking(false); }
  };
  const save = async () => {
    const parsed = Number(birthYear);
    if (!gender || !province.trim() || !Number.isInteger(parsed)) return setNotice("Hãy điền giới tính, tỉnh thành và năm sinh.");
    if (parsed > year - 18 || parsed < 1900) return setNotice("Tìm Quanh Đây chỉ dành cho người từ 18 tuổi.");
    setWorking(true);
    try { setFromProfile(await nearbyApi.saveProfile({ gender, status, province, birthYear: parsed, bio, job })); setNotice("Đã lưu hồ sơ Tìm Quanh Đây."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Không thể lưu hồ sơ."); }
    finally { setWorking(false); }
  };
  const changeVisibility = async (visible: boolean, duration?: HideDuration) => {
    try { setFromProfile(await nearbyApi.toggle(visible, duration)); setPicker(null); setNotice(visible ? "Bạn đã xuất hiện lại trong Tìm Quanh Đây." : "Đã ẩn hồ sơ của bạn."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Không thể cập nhật quyền riêng tư."); }
  };
  const find = useCallback(async () => {
    let lat = profile?.lat; let lng = profile?.lng;
    if (lat === null || lng === null || lat === undefined || lng === undefined) {
      try { const coords = await getLocation(); lat = coords.latitude; lng = coords.longitude; } catch (error) { setNotice(error instanceof Error ? error.message : "Chưa có vị trí KINI."); return; }
    }
    setSearching(true);
    try { const response = await nearbyApi.list({ lat, lng, radius, gender: filterGender, status: filterStatus, province: filterProvince, ageFrom: Number(ageFrom) || 18, ageTo: Number(ageTo) || 100, q: query, sort }); setPeople(response.users); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Không thể tìm người quanh đây."); }
    finally { setSearching(false); }
  }, [ageFrom, ageTo, filterGender, filterProvince, filterStatus, getLocation, profile?.lat, profile?.lng, query, radius, sort]);
  useEffect(() => { if (active === "explore" && profile?.lat !== null && profile?.lng !== null) void find(); }, [active, find, profile?.lat, profile?.lng]);
  useEffect(() => {
    const refresh = setInterval(() => { void load(); if (active === "explore") void find(); }, 15000);
    return () => clearInterval(refresh);
  }, [active, find, load]);
  const hiddenText = useMemo(() => profile?.hiddenUntil ? `đến ${new Date(profile.hiddenUntil).toLocaleDateString("vi-VN")}` : "vĩnh viễn", [profile?.hiddenUntil]);
  const reset = () => { setQuery(""); setRadius(50); setFilterGender(undefined); setFilterStatus(undefined); setFilterProvince(""); setAgeFrom("18"); setAgeTo("100"); setSort("near"); };

  if (profileLoading) return <ScreenContainer><View style={styles.center}><ActivityIndicator size="large" color={kiniColors.blue} /><Text style={styles.muted}>Đang chuẩn bị Tìm Quanh Đây...</Text></View></ScreenContainer>;
  if (working) return <ScreenContainer><View style={styles.center}><KiniCard style={styles.loading}><View style={styles.loadingIcon}><MaterialIcons name="person" size={28} color={kiniColors.blue} /></View><Text style={styles.loadingTitle}>Đang tạo hồ sơ của bạn</Text><View style={styles.track}><View style={styles.fill} /></View><Text style={styles.muted}>90%</Text></KiniCard></View></ScreenContainer>;

  const header = <>
    <View style={styles.header}><Text style={styles.title}>Gặp người phù hợp ngay quanh đây</Text><Text style={styles.subtitle}>50 km và 100 km luôn FREE cho mọi tài khoản KINI.</Text></View>
    {!profile?.isDiscoverable ? <KiniCard style={styles.hidden}><MaterialIcons name="visibility-off" size={20} color={kiniColors.blue} /><View style={styles.flex}><Text style={styles.strong}>Bạn đang ẩn</Text><Text style={styles.small}>Người khác không thấy bạn {hiddenText}.</Text></View><KiniButton label="Bật lại" onPress={() => void changeVisibility(true)} variant="secondary" /></KiniCard> : null}
    <View style={styles.search}><MaterialIcons name="search" size={20} color={kiniColors.muted} /><TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => void find()} placeholder="Tìm theo tên, khu vực" placeholderTextColor={kiniColors.muted} returnKeyType="search" style={styles.searchInput} /></View>
    <View style={styles.filters}><Pick label={label(filterGender, genders, "Giới tính")} onPress={() => setPicker("gender")} /><Pick label={`${radius} km`} onPress={() => setPicker("radius")} /><Pick label={filterProvince || "Tỉnh thành"} onPress={() => setPicker("province")} /><Pick label={`${ageFrom}–${ageTo} tuổi`} onPress={() => setPicker("age")} /><Pick label={label(filterStatus, statuses, "Tình trạng")} onPress={() => setPicker("status")} /><Pick label={sort === "near" ? "Gần đến xa" : "Xa đến gần"} onPress={() => setPicker("sort")} /></View>
    <View style={styles.actionRow}><TouchableOpacity onPress={reset}><Text style={styles.link}>Xóa bộ lọc</Text></TouchableOpacity><KiniButton label="Tìm" onPress={() => void find()} /></View>
    <Text style={styles.result}>{searching ? "Đang tìm..." : `${people.length} người trong phạm vi ${radius} km`}</Text>
  </>;

  return <ScreenContainer>
    <View style={styles.tabs}><Tab label="Khám phá" active={active === "explore"} onPress={() => setActive("explore")} /><Tab label="Tôi" active={active === "me"} onPress={() => setActive("me")} /></View>
    {active === "explore" ? <FlatList data={people} keyExtractor={(item) => String(item.userId)} ListHeaderComponent={header} contentContainerStyle={styles.list} renderItem={({ item }) => <Person user={item} onPress={() => { setSelected(item); setPicker("detail"); }} />} ListEmptyComponent={!searching ? <KiniCard style={styles.empty}><MaterialIcons name="location-searching" size={30} color={kiniColors.blue} /><Text style={styles.strong}>Chưa có ai phù hợp</Text><Text style={styles.emptyText}>Hãy thử 50 km hoặc 100 km miễn phí, hoặc cập nhật vị trí KINI.</Text></KiniCard> : null} /> : <ScrollView contentContainerStyle={styles.profileContent} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><Text style={styles.title}>Hồ sơ Tìm Quanh Đây</Text><Text style={styles.subtitle}>Tên và avatar được lấy từ tài khoản KINI thật của bạn.</Text></View>
      <KiniCard style={styles.identity}><Avatar initials={initial(profile?.name ?? "KINI")} color={profile?.avatarColor ?? kiniColors.blue} imageUri={profile?.avatar} size={56} /><View style={styles.flex}><Text style={styles.identityName}>{profile?.name ?? "Thành viên KINI"}</Text><Text style={styles.muted}>{profile?.lat === null ? "Chưa chia sẻ vị trí" : "Vị trí KINI đã sẵn sàng"}</Text></View><TouchableOpacity onPress={() => void allow()}><MaterialIcons name="my-location" size={23} color={kiniColors.blue} /></TouchableOpacity></KiniCard>
      <KiniCard style={styles.form}><Choice title="Giới tính" value={label(gender, genders, "Chọn giới tính")} onPress={() => setPicker("gender")} /><Choice title="Tình trạng" value={label(status, statuses, "Chọn tình trạng")} onPress={() => setPicker("status")} /><FormField label="Tỉnh thành" value={province} onChangeText={setProvince} placeholder="Ví dụ: Hà Nội" /><FormField label="Năm sinh" value={birthYear} onChangeText={setBirthYear} placeholder="Ví dụ: 1998" keyboardType="number-pad" maxLength={4} /><FormField label="Giới thiệu" value={bio} onChangeText={setBio} placeholder="Một vài điều về bạn" multiline /><FormField label="Công việc" value={job} onChangeText={setJob} placeholder="Ví dụ: Thiết kế" /><PrimaryButton label="Lưu Hồ Sơ" onPress={() => void save()} /></KiniCard>
      <KiniCard style={styles.privacy}><Text style={styles.privacyTitle}>Quyền riêng tư</Text><KiniSwitch label="Cho phép người khác tìm thấy tôi" description="Khi tắt, hồ sơ của bạn không hiển thị trong nearby." value={profile?.isDiscoverable ?? true} onValueChange={(visible) => visible ? void changeVisibility(true) : setPicker("hide")} />{!profile?.isDiscoverable ? <View style={styles.private}><MaterialIcons name="visibility-off" size={18} color={kiniColors.blue} /><Text style={styles.small}>Bạn đang ẩn {hiddenText}.</Text><TouchableOpacity onPress={() => void changeVisibility(true)}><Text style={styles.link}>Bật lại</Text></TouchableOpacity></View> : null}</KiniCard>
    </ScrollView>}
    <KiniBottomSheet visible={permissionSheet} title="KINI cần quyền của bạn" onClose={() => { setPermissionSheet(false); setActive("me"); }}><Permission icon="account-circle" text="Tên và ảnh đại diện KINI" /><Permission icon="location-on" text="Vị trí KINI" /><View style={styles.sheetActions}><KiniButton label="Từ chối" onPress={() => { setPermissionSheet(false); setActive("me"); }} variant="secondary" /><KiniButton label="Cho phép" onPress={() => void allow()} /></View></KiniBottomSheet>
    <KiniBottomSheet visible={picker === "hide"} title="Ẩn hồ sơ trong bao lâu?" onClose={() => setPicker(null)}><Text style={styles.sheetText}>Bạn vẫn có thể khám phá người khác, nhưng họ không thấy bạn.</Text><KiniButton label="Ẩn 24h" onPress={() => void changeVisibility(false, "24h")} variant="secondary" /><KiniButton label="Ẩn 7 ngày" onPress={() => void changeVisibility(false, "7d")} variant="secondary" /><KiniButton label="Ẩn vĩnh viễn" onPress={() => void changeVisibility(false, "permanent")} variant="danger" /></KiniBottomSheet>
    <KiniBottomSheet visible={picker === "gender"} title="Chọn giới tính" onClose={() => setPicker(null)}><Options values={["male", "female", "other", "prefer_not"] as NearbyGender[]} labels={genders} onChoose={(value) => { active === "me" ? setGender(value) : setFilterGender(value); setPicker(null); }} /><KiniButton label="Tất cả giới tính" onPress={() => { active === "me" ? setGender(null) : setFilterGender(undefined); setPicker(null); }} variant="secondary" /></KiniBottomSheet>
    <KiniBottomSheet visible={picker === "status"} title="Chọn tình trạng" onClose={() => setPicker(null)}><Options values={["single", "dating", "married", "complicated", "prefer_not"] as NearbyStatus[]} labels={statuses} onChoose={(value) => { active === "me" ? setStatus(value) : setFilterStatus(value); setPicker(null); }} /><KiniButton label="Tất cả tình trạng" onPress={() => { active === "me" ? setStatus(null) : setFilterStatus(undefined); setPicker(null); }} variant="secondary" /></KiniBottomSheet>
    <KiniBottomSheet visible={picker === "radius"} title="Khoảng cách miễn phí" onClose={() => setPicker(null)}><Options values={[...radii]} labels={{ 5: "5 km · FREE", 10: "10 km · FREE", 20: "20 km · FREE", 30: "30 km · FREE", 50: "50 km · FREE", 100: "100 km · FREE" }} onChoose={(value) => { setRadius(value); setPicker(null); }} /></KiniBottomSheet>
    <KiniBottomSheet visible={picker === "province"} title="Lọc tỉnh thành" onClose={() => setPicker(null)}><FormField label="Tỉnh thành" value={filterProvince} onChangeText={setFilterProvince} placeholder="Ví dụ: Hà Nội" /><KiniButton label="Xong" onPress={() => setPicker(null)} /></KiniBottomSheet>
    <KiniBottomSheet visible={picker === "age"} title="Lọc độ tuổi" onClose={() => setPicker(null)}><View style={styles.ageFields}><View style={styles.flex}><FormField label="Từ" value={ageFrom} onChangeText={setAgeFrom} keyboardType="number-pad" /></View><View style={styles.flex}><FormField label="Đến" value={ageTo} onChangeText={setAgeTo} keyboardType="number-pad" /></View></View><KiniButton label="Xong" onPress={() => setPicker(null)} /></KiniBottomSheet>
    <KiniBottomSheet visible={picker === "sort"} title="Sắp xếp" onClose={() => setPicker(null)}><Options values={["near", "far"] as Array<"near" | "far">} labels={{ near: "Gần đến xa", far: "Xa đến gần" }} onChoose={(value) => { setSort(value); setPicker(null); }} /></KiniBottomSheet>
    <KiniBottomSheet visible={picker === "detail"} title="Hồ sơ KINI" onClose={() => setPicker(null)}>{selected ? <><View style={styles.detail}><Avatar initials={initial(selected.name)} color={selected.avatarColor} size={66} /><View style={styles.flex}><Text style={styles.identityName}>{selected.name}</Text><Text style={styles.muted}>{selected.province ?? "KINI"} · {selected.distanceKm} km</Text></View></View><Text style={styles.detailBio}>{selected.bio || "Chưa có giới thiệu."}</Text><Text style={styles.small}>{[selected.gender && genders[selected.gender], selected.age && `${selected.age} tuổi`, selected.status && statuses[selected.status], selected.job].filter(Boolean).join(" · ")}</Text></> : null}</KiniBottomSheet>
    {notice ? <TouchableOpacity onPress={() => setNotice(null)} style={styles.notice}><MaterialIcons name="info-outline" size={18} color={kiniColors.blue} /><Text style={styles.noticeText}>{notice}</Text><MaterialIcons name="close" size={18} color={kiniColors.muted} /></TouchableOpacity> : null}
  </ScreenContainer>;
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.tabActive]}><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></TouchableOpacity>; }
function Pick({ label, onPress }: { label: string; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={styles.pick}><Text numberOfLines={1} style={styles.pickText}>{label}</Text><MaterialIcons name="keyboard-arrow-down" size={17} color={kiniColors.muted} /></TouchableOpacity>; }
function Choice({ title, value, onPress }: { title: string; value: string; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={styles.choice}><Text style={styles.choiceTitle}>{title}</Text><View style={styles.choiceRight}><Text style={styles.choiceValue}>{value}</Text><MaterialIcons name="chevron-right" size={20} color={kiniColors.muted} /></View></TouchableOpacity>; }
function Permission({ icon, text }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; text: string }) { return <View style={styles.permission}><View style={styles.permissionIcon}><MaterialIcons name={icon} size={21} color={kiniColors.blue} /></View><Text style={styles.permissionText}>{text}</Text><MaterialIcons name="check-circle" size={19} color={kiniColors.green} /></View>; }
function Options<T extends string | number>({ values, labels, onChoose }: { values: T[]; labels: Record<T, string>; onChoose: (value: T) => void }) { return <View>{values.map((value) => <TouchableOpacity key={String(value)} onPress={() => onChoose(value)} style={styles.option}><Text style={styles.optionText}>{labels[value]}</Text><MaterialIcons name="chevron-right" size={20} color={kiniColors.muted} /></TouchableOpacity>)}</View>; }
function Person({ user, onPress }: { user: NearbyUser; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={styles.person}><Avatar initials={initial(user.name)} color={user.avatarColor} imageUri={user.avatar} size={52} /><View style={styles.flex}><View style={styles.personTop}><Text numberOfLines={1} style={styles.personName}>{user.name}</Text><Text style={styles.distance}>{user.distanceKm} km</Text></View><Text numberOfLines={1} style={styles.small}>{user.province ?? "KINI"} · {user.bio || user.job || "Thành viên KINI"}</Text><Text numberOfLines={1} style={styles.tags}>{[user.gender && genders[user.gender], user.birthYear].filter(Boolean).join(" · ")}</Text></View><MaterialIcons name="chevron-right" size={21} color={kiniColors.muted} /></TouchableOpacity>; }

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }, loading: { width: "100%", maxWidth: 330, alignItems: "center", gap: 10, paddingVertical: 25 }, loadingIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.mist }, loadingTitle: { color: kiniColors.navy, fontSize: 17, fontWeight: "900" }, track: { width: "80%", height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: kiniColors.line }, fill: { width: "90%", height: "100%", backgroundColor: kiniColors.blue }, muted: { color: kiniColors.muted, fontSize: 13 }, tabs: { margin: 16, marginBottom: 0, flexDirection: "row", gap: 8, padding: 4, borderRadius: 14, backgroundColor: kiniColors.mist }, tab: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 10 }, tabActive: { backgroundColor: kiniColors.white }, tabText: { color: kiniColors.muted, fontSize: 14, fontWeight: "800" }, tabTextActive: { color: kiniColors.blue }, list: { paddingHorizontal: 16, paddingBottom: 110 }, profileContent: { paddingHorizontal: 16, paddingBottom: 110 }, header: { paddingTop: 18, paddingBottom: 14 }, title: { color: kiniColors.navy, fontSize: 23, fontWeight: "900" }, subtitle: { color: kiniColors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 }, hidden: { marginBottom: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 }, flex: { flex: 1 }, strong: { color: kiniColors.navy, fontSize: 14, fontWeight: "900" }, small: { color: kiniColors.muted, fontSize: 12, lineHeight: 17 }, search: { minHeight: 48, borderRadius: 14, borderColor: kiniColors.line, borderWidth: 1, backgroundColor: kiniColors.white, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13 }, searchInput: { flex: 1, color: kiniColors.navy, fontSize: 14 }, filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, pick: { maxWidth: "48%", minHeight: 38, borderRadius: 12, borderColor: kiniColors.line, borderWidth: 1, backgroundColor: kiniColors.white, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" }, pickText: { maxWidth: 125, color: kiniColors.navy, fontSize: 12, fontWeight: "700" }, actionRow: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, link: { color: kiniColors.blue, fontSize: 13, fontWeight: "800" }, result: { marginTop: 17, marginBottom: 8, color: kiniColors.muted, fontSize: 12, fontWeight: "800" }, person: { padding: 13, marginBottom: 9, borderRadius: 17, borderColor: kiniColors.line, borderWidth: StyleSheet.hairlineWidth, backgroundColor: kiniColors.white, flexDirection: "row", alignItems: "center", gap: 11 }, personTop: { flexDirection: "row", alignItems: "center", gap: 8 }, personName: { flex: 1, color: kiniColors.navy, fontSize: 15, fontWeight: "900" }, distance: { color: kiniColors.blue, fontSize: 12, fontWeight: "800" }, tags: { marginTop: 3, color: kiniColors.muted, fontSize: 11, fontWeight: "700" }, empty: { alignItems: "center", gap: 8, paddingVertical: 28 }, emptyText: { color: kiniColors.muted, fontSize: 13, lineHeight: 18, textAlign: "center" }, identity: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }, identityName: { color: kiniColors.navy, fontSize: 17, fontWeight: "900" }, form: { gap: 15 }, privacy: { marginTop: 12, gap: 12 }, privacyTitle: { color: kiniColors.navy, fontSize: 16, fontWeight: "900" }, private: { paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: kiniColors.line, flexDirection: "row", alignItems: "center", gap: 7 }, choice: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: kiniColors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, choiceTitle: { color: kiniColors.navy, fontSize: 14, fontWeight: "700" }, choiceRight: { flexDirection: "row", alignItems: "center" }, choiceValue: { maxWidth: 155, color: kiniColors.muted, fontSize: 13 }, permission: { minHeight: 53, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: kiniColors.line }, permissionIcon: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.mist }, permissionText: { flex: 1, color: kiniColors.navy, fontSize: 14, fontWeight: "700" }, sheetActions: { flexDirection: "row", gap: 10 }, sheetText: { color: kiniColors.muted, fontSize: 13, lineHeight: 19 }, option: { minHeight: 47, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: kiniColors.line }, optionText: { color: kiniColors.navy, fontSize: 15, fontWeight: "700" }, ageFields: { flexDirection: "row", gap: 12 }, detail: { flexDirection: "row", alignItems: "center", gap: 12 }, detailBio: { color: kiniColors.navy, fontSize: 14, lineHeight: 20 }, notice: { position: "absolute", bottom: 20, left: 16, right: 16, padding: 12, borderRadius: 14, borderColor: kiniColors.line, borderWidth: StyleSheet.hairlineWidth, backgroundColor: kiniColors.white, flexDirection: "row", alignItems: "center", gap: 8 }, noticeText: { flex: 1, color: kiniColors.navy, fontSize: 12, lineHeight: 17 },
});
