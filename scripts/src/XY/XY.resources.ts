import { UIResources } from "../inf/IUI";

export interface IResources {
    FORUM_THREAD_HREF: string;
    UI: UIResources;
    ERRORS: {
        SCREEN_REDIRECT: string
    }
}

export const Resources: IResources = {
    FORUM_THREAD_HREF: "https://forum.plemiona.pl/index.php?threads/hermitowskiexy.126480/",
    ERRORS: {
        SCREEN_REDIRECT: "Przechodzę do przeglądu mapy",
    },
    UI: {
        include_partners: {
            label: "Sojusznicy",
            title: "Czy zbierać wioski plemion sojuszników"
        },
        include_naps: {
            label: "PON",
            title: "Czy zbierać wioski plemion z paktami o nieagresji"
        },
        include_enemies: {
            label: "Wrogowie",
            title: "Czy zbierać wioski wrogich plemion"
        },
        include_own: {
            label: "Własne",
            title: "Czy zbierać własne wioski"
        },
        include_friends: {
            label: "Znajomi",
            title: "Czy zbierać wioski należące do znajomych"
        },
        include_non_attackable: {
            label: "Nie atakowalne",
            title: "Czy zbierać wioski, których nie można zaatakować"
        },
        include_barbarians: {
            label: "Barbarzyńcy",
            title: "Czy zbierać wioski barbarzyńskie"
        },
        include_bonuses: {
            label: "Bonusowe",
            title: "Czy zbierać wioski z bonusami"
        },
        include_others: {
            label: "Pozostałe",
            title: "Czy zbierać wioski, które nie należą do wcześniej grup"
        },
        filter_type: {
            label: "Filtr",
            title: "Określa w jaki sposób aplikować filtry"
        },
        filter_type_union: {
            label: "Suma",
            title: "Co najmniej jeden filtr musi być spełniony"
        },
        filter_type_intersection: {
            label: "Przecięcie",
            title: "Wszystkie filtry muszą być spełnione"
        },
        scan: {
            label: "Skanuj",
            title: "Dodaje do listy wcześniej nienapotkane wioski"
        },
        clear: {
            label: "Wyczyść",
            title: "Usuwa zaznaczone wioski"
        },
        end: {
            label: "Zakończ",
            title: "Kończy działanie skryptu",
        }
    }
};